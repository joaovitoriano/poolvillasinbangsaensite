import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { booking, period, setup } from "./helpers";
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2030-09-10T05:00:00Z")); });
afterEach(() => vi.useRealTimers());
async function mixed() {
  const f = await setup();
  const assignmentId = await f.t.run(ctx => ctx.db.insert("villaAssignments", { villaId: f.secondVilla, userId: f.users[2], role: "owner", createdAt: Date.now() }));
  await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  const otherBooking = await f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId, guestName: "Other Guest", checkIn: "2030-09-24", checkOut: "2030-09-26" });
  await f.admin.mutation(api.bookings.create, { ...booking, villaId: f.secondVilla, guestName: "Owner Guest" });
  vi.setSystemTime(new Date("2030-09-27T00:00:00Z"));
  return { ...f, assignmentId, otherBooking };
}
it("separates villa lists, totals, contact visibility and writes by selected mode", async () => {
  const f = await mixed();
  expect((await f.agent.query(api.users.current, {}))?.availableRoles).toEqual(["owner", "agent"]);
  expect((await f.agent.query(api.villas.listAccessible, {})).map(v => v._id)).toEqual([f.villaId]);
  expect((await f.agent.query(api.financials.portfolio, period)).totals).toEqual({ bookingCount: 1, chargedThb: 5500, commissionsThb: 550 });
  expect((await f.agent.query(api.bookings.get, f.otherBooking))?.contactsHidden).toBe(true);
  await f.agent.mutation(api.users.switchAccountMode, { mode: "owner" });
  expect((await f.agent.query(api.villas.listAccessible, {})).map(v => v._id)).toEqual([f.secondVilla]);
  const financials = await f.agent.query(api.financials.portfolio, period);
  expect(financials.totals).toMatchObject({ bookingCount: 1, chargedThb: 5500, villaNetThb: 4950 });
  await expect(f.agent.query(api.bookings.get, f.otherBooking)).rejects.toThrow();
  await expect(f.agent.mutation(api.closedDates.save, { villaId: f.villaId, from: "2030-10-01", to: "2030-10-02", confirmCancellation: false })).rejects.toThrow();
  await expect(f.agent.mutation(api.bookings.cancel, f.otherBooking)).rejects.toThrow();
  const overview = await f.agent.query(api.overview.get, { ...period, weekFrom: "2030-09-23", weekTo: "2030-09-30" });
  expect(overview.activeVillas).toBe(1);
  expect(overview.totals.bookingCount).toBe(1);
  expect(await f.agent.query(api.guests.search, { name: "Other Guest" })).toEqual([]);
  await f.agent.mutation(api.users.syncCurrent, {});
  expect((await f.agent.query(api.users.current, {}))?.role).toBe("owner");
});
it("falls back to the remaining role after removal and rejects unavailable modes", async () => {
  const f = await mixed();
  await f.agent.mutation(api.users.switchAccountMode, { mode: "owner" });
  await f.admin.mutation(api.team.removeMember, { assignmentId: f.assignmentId });
  expect((await f.agent.query(api.users.current, {}))?.role).toBe("agent");
  await expect(f.agent.mutation(api.users.switchAccountMode, { mode: "owner" })).rejects.toThrow();
  await expect(f.agent.mutation(api.users.switchAccountMode, { mode: "admin" } as never)).rejects.toThrow();
  await expect(f.agent.mutation(api.users.switchAccountMode, {} as never)).rejects.toThrow();
});
it("keeps admins unrestricted and does not let them switch modes", async () => {
  const f = await mixed();
  await f.t.run(ctx => ctx.db.insert("villaAssignments", { villaId: f.secondVilla, userId: f.users[0], role: "agent", createdAt: Date.now() }));
  expect((await f.admin.query(api.users.current, {}))?.role).toBe("admin");
  expect((await f.admin.query(api.villas.listAccessible, {}))).toHaveLength(2);
  expect((await f.admin.query(api.financials.portfolio, period)).totals.bookingCount).toBe(3);
  await expect(f.admin.mutation(api.users.switchAccountMode, { mode: "agent" })).rejects.toThrow();
});
