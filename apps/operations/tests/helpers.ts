/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { permissions } from "../convex/lib/auth";

const modules = import.meta.glob("../convex/**/*.ts");
export const period = { from: "2030-01-01", to: "2031-01-01" };
export const booking = { guestName: "Araya Wong", guestPhone: "081-000-2002", guestLineId: "araya.w", checkIn: "2030-09-20", checkOut: "2030-09-22", discountMode: "amount" as const, discountValue: 500, commissionMode: "percentage" as const, commissionValue: 10 };
export async function setup() {
  const t = convexTest(schema, modules);
  const roles = ["admin", "owner", "agent", "other"] as const;
  const users = await t.run(async ctx => {
    const ids = [];
    for (const key of roles) ids.push(await ctx.db.insert("operationsUsers", { workosUserId: key, email: `${key}@example.test`, name: key, role: key === "other" ? "agent" : key, permissions: key === "admin" ? Object.values(permissions) : [permissions.villasReadAssigned, permissions.bookingsCreate, permissions.bookingsUpdateOwn, ...(key === "owner" ? [permissions.bookingsReadAssigned, permissions.financialsReadVilla] : [permissions.bookingsReadOwn])], active: true, lastSeenAt: Date.now() }));
    return ids;
  });
  const identity = (key: typeof roles[number]) => ({ tokenIdentifier: key, subject: key, issuer: "https://auth.test", org_id: "org_test", email: `${key}@example.test`, first_name: "Auth Name", permissions: key === "admin" ? Object.values(permissions) : [permissions.bookingsCreate, permissions.bookingsUpdateOwn, ...(key === "owner" ? [permissions.bookingsReadAssigned] : [])] });
  const admin = t.withIdentity(identity("admin")), owner = t.withIdentity(identity("owner")), agent = t.withIdentity(identity("agent")), other = t.withIdentity(identity("other"));
  const villaData = { name: "Coral House", contactName: "Khun Dao", contactPhone: "080-000-1001", contactLineId: "coralhouse", defaultNightlyPriceThb: 3000 };
  const { villaId } = await admin.mutation(api.villas.create, villaData);
  const { villaId: secondVilla } = await admin.mutation(api.villas.create, { ...villaData, name: "Sea Breeze" });
  await t.run(async ctx => {
    for (const index of [1, 2, 3]) await ctx.db.insert("villaAssignments", { villaId, userId: users[index], role: index === 1 ? "owner" : "agent", createdAt: Date.now() });
  });
  const activity = () => admin.query(api.activity.list, { page: 1 });
  const counts = () => t.run(async ctx => ({ bookings: (await ctx.db.query("bookings").collect()).length, nights: (await ctx.db.query("bookingNights").collect()).length, closed: (await ctx.db.query("closedDates").collect()).length, closedNights: (await ctx.db.query("closedDateNights").collect()).length, guests: (await ctx.db.query("guests").collect()).length, activity: (await ctx.db.query("activity").collect()).length }));
  return { t, admin, owner, agent, other, users, villaId, secondVilla, villaData, activity, counts, identity };
}
