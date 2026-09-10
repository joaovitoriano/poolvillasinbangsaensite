import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

const tracked: Record<string, string[]> = {
  bookings: ["checkIn", "checkOut", "status", "subtotalThb", "discountThb", "discountMode", "discountValue", "totalChargedThb", "creatorCommissionThb", "villaNetThb", "commissionMode", "commissionValue", "notes"],
  closedDates: ["from", "to", "notes", "status"],
  villas: ["name", "contactName", "contactPhone", "contactLineId", "archived"],
  pricingPresets: ["name", "nightlyPriceThb", "daysOfWeek", "dateFrom", "dateTo", "sortOrder", "active", "isDefault"],
  operationsUsers: ["name", "phone", "lineId", "email", "role", "accountMode", "active"],
  villaInvitations: ["email", "role", "status"],
  villaAssignments: ["role", "userId"],
};

// Capture successful writes in the same transaction; occupancy/index rows are excluded.
export function activityContext(ctx: MutationCtx, actor: Doc<"operationsUsers">, scopeVillaId?: Id<"villas">, reason?: "bookingToClosedDate" | "closedDateToBooking"): MutationCtx {
  const db = ctx.db;
  type Snapshot = Record<string, string>;
  const events = new Map<string, { before: Snapshot | null; eventId?: Id<"activity">; createdAt: number }>();
  async function snapshot(table: string, row: Record<string, unknown> | null): Promise<Snapshot | null> {
    if (!row) return null;
    const result: Snapshot = {};
    for (const field of tracked[table]) result[field] = row[field] === undefined ? "" : typeof row[field] === "string" ? row[field] : JSON.stringify(row[field]);
    if (table === "bookings") {
      const guest = await db.get(row.guestId as Id<"guests">);
      result.guestName = guest?.name ?? ""; result.guestPhone = guest?.phone ?? ""; result.guestLineId = guest?.lineId ?? "";
    }
    if (table === "bookings" || table === "closedDates") {
      const creator = await db.get(row.createdByUserId as Id<"operationsUsers">);
      result.createdBy = creator?.name ?? "";
    }
    if (table === "villaAssignments") {
      const member = await db.get(row.userId as Id<"operationsUsers">);
      result.userId = member?.name ?? "";
      result.email = member?.email ?? "";
    }
    return result;
  }
  async function record(table: string, id: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
    if (!tracked[table]) return;
    // Merge writes to the same record within one action, hiding intermediate states.
    const event = events.get(id) ?? { before: await snapshot(table, before), createdAt: Date.now() };
    events.set(id, event);
    const final = await snapshot(table, after);
    const keys = [...new Set([...Object.keys(event.before ?? {}), ...Object.keys(final ?? {})])];
    const changes = keys.map(field => ({ field, before: event.before?.[field] ?? "", after: final?.[field] ?? "" }));
    if (!changes.some(change => change.before !== change.after)) {
      if (event.eventId) { await db.delete(event.eventId); event.eventId = undefined; }
      return;
    }
    if (reason) changes.push({ field: "reason", before: reason, after: reason });
    const row = after ?? before;
    const villaId = (table === "villas" ? id : row?.villaId ?? scopeVillaId) as Id<"villas"> | undefined;
    const villa = villaId ? await db.get(villaId) : null;
    const values = { actorId: actor._id, actorName: actor.name, entity: table, entityId: id,
      action: !event.before ? "created" : !final ? "deleted" : final.status === "cancelled" && event.before.status !== "cancelled" ? "cancelled" : "updated",
      villaId, villaName: villa?.name ?? (table === "villas" ? String(row?.name ?? "") : undefined), changes, createdAt: event.createdAt };
    if (event.eventId) await db.replace(event.eventId, values);
    else event.eventId = await db.insert("activity", values);
  }
  const proxy = new Proxy(db, {
    get(target, property) {
      if (property === "insert") return async (table: string, value: never) => {
        const id = await db.insert(table as "bookings", value);
        await record(table, id, null, value);
        return id;
      };
      if (property === "patch" || property === "replace" || property === "delete") return async (...args: unknown[]) => {
        const explicitTable = typeof args[0] === "string" && Boolean(tracked[args[0]]) && typeof args[1] === "string";
        const id = (explicitTable ? args[1] : args[0]) as Id<"bookings">;
        const table = Object.keys(tracked).find(name => db.normalizeId(name as "bookings", id) !== null);
        const before = table ? await db.get(id) : null;
        const method = target[property] as (...values: unknown[]) => Promise<unknown>;
        const result = await method.apply(target, args);
        if (table) await record(table, id, before, property === "delete" ? null : await db.get(id));
        return result;
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { ...ctx, db: proxy };
}
