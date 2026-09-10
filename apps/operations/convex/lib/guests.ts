import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type GuestDetails = {
  guestId?: Id<"guests">;
  guestName: string;
  guestPhone: string;
  guestLineId?: string;
};

export function normalizeGuestName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeLineId(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export async function saveGuest(ctx: MutationCtx, details: GuestDetails, now = Date.now()) {
  const name = details.guestName.trim().replace(/\s+/g, " ");
  const phone = details.guestPhone.trim();
  const lineId = details.guestLineId?.trim() || undefined;
  if (!name) throw new Error("Guest name is required / กรุณาระบุชื่อผู้เข้าพัก");

  const normalizedName = normalizeGuestName(name);
  const normalizedPhone = normalizePhone(phone);
  const normalizedLineId = lineId ? normalizeLineId(lineId) : undefined;
  let guestId = details.guestId;

  if (guestId && !(await ctx.db.get(guestId))) guestId = undefined;
  if (!guestId && normalizedPhone) {
    guestId = (await ctx.db
      .query("guests")
      .withIndex("by_normalizedPhone", (q) => q.eq("normalizedPhone", normalizedPhone))
      .first())?._id;
  }
  if (!guestId && normalizedLineId) {
    guestId = (await ctx.db
      .query("guests")
      .withIndex("by_normalizedLineId", (q) => q.eq("normalizedLineId", normalizedLineId))
      .first())?._id;
  }

  const values = {
    name,
    normalizedName,
    phone,
    normalizedPhone,
    lineId,
    normalizedLineId,
    updatedAt: now,
  };
  if (guestId) {
    const existing = await ctx.db.get(guestId);
    if (existing && existing.name === name && existing.phone === phone && existing.lineId === lineId) return guestId;
    // A booking edit must not rewrite contact details on other bookings sharing a guest.
    return ctx.db.insert("guests", { ...values, createdAt: now });
  }
  return ctx.db.insert("guests", { ...values, createdAt: now });
}
