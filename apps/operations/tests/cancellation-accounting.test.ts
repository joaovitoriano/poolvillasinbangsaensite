import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { setup, booking, period } from "./helpers";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2030-09-10T05:00:00Z")); });
afterEach(() => vi.useRealTimers());

it.each([false, true])("accounts for cancelled bookings with deleteCommission=%s across every role and view", async deleteCommission => {
  const f = await setup();
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  const range = { from: "2030-09-10", to: "2030-09-11" };
  expect((await f.admin.query(api.financials.portfolio, range)).totals).toMatchObject({ bookingCount: 1, grossThb: 6000, discountsThb: 500, chargedThb: 5500, commissionsThb: 550, villaNetThb: 4950 });
  vi.setSystemTime(new Date("2030-10-01T05:00:00Z"));
  await f.agent.mutation(api.bookings.cancel, { bookingId, deleteCommission });
  const expense = deleteCommission ? 0 : 550;
  const expected = { bookingCount: 0, grossThb: 0, discountsThb: 0, chargedThb: 0, commissionsThb: expense, villaNetThb: 0 - expense };
  for (const caller of [f.admin, f.owner]) {
    const portfolio = await caller.query(api.financials.portfolio, range);
    expect(portfolio.totals).toEqual(expected);
    expect(portfolio.byVilla.find(v => v.villaId === f.villaId)).toMatchObject(expected);
    const villa = await caller.query(api.financials.villa, { villaId: f.villaId, ...range });
    expect(villa.totals).toEqual(expected);
    if (!deleteCommission) {
      expect(villa.series).toEqual([{ date: "2030-09-10", ...expected }]);
      expect(villa.byUser[0]).toMatchObject(expected);
      expect(villa.bookings[0].accounting).toEqual(expected);
      expect(villa.bookings[0].accountingDate).toBe("2030-09-10");
      expect(portfolio.byVillaUser.find(v => v.userId === f.users[2])).toMatchObject(expected);
    }
    expect((await caller.query(api.overview.get, { ...range, weekFrom: "2030-09-20", weekTo: "2030-09-27" })).totals).toMatchObject({ bookingCount: 0, chargedThb: 0, commissionsThb: expense, villaNetThb: 0 - expense });
  }
  expect((await f.agent.query(api.financials.portfolio, range)).totals).toEqual({ bookingCount: 0, chargedThb: 0, commissionsThb: expense });
  expect((await f.other.query(api.financials.portfolio, range)).totals.commissionsThb).toBe(0);
  expect((await f.admin.query(api.financials.portfolio, { from: "2030-10-01", to: "2030-10-02" })).totals.commissionsThb).toBe(0);
  expect(await f.agent.query(api.bookings.get, { bookingId })).toMatchObject({ status: "cancelled", creatorCommissionThb: 550, totalChargedThb: 5500, retainedCommissionThb: expense });
  await f.agent.mutation(api.bookings.cancel, { bookingId, deleteCommission: !deleteCommission });
  expect((await f.agent.query(api.financials.portfolio, range)).totals.commissionsThb).toBe(expense);
  expect((await f.counts()).nights).toBe(0);
  expect((await f.activity()).page.find(r => r.entityId === bookingId && r.action === "cancelled")?.changes).toEqual(expect.arrayContaining([expect.objectContaining({ field: "retainedCommissionThb", after: String(expense) })]));
});

it.each([false, true])("applies the commission choice when converting to a closed date: %s", async deleteCommission => {
  const f = await setup();
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  const args = { villaId: f.villaId, bookingId, from: "2030-09-20", to: "2030-09-21", confirmCancellation: true, deleteCommission };
  await expect(f.other.mutation(api.closedDates.save, args)).rejects.toThrow();
  expect((await f.agent.query(api.bookings.get, { bookingId }))?.status).toBe("confirmed");
  await f.agent.mutation(api.closedDates.save, args);
  expect((await f.admin.query(api.financials.portfolio, period)).totals).toMatchObject({ bookingCount: 0, chargedThb: 0, commissionsThb: deleteCommission ? 0 : 550, villaNetThb: deleteCommission ? 0 : -550 });
});

it("uses Bangkok creation-day boundaries and leaves revenue in place after rescheduling", async () => {
  const f = await setup();
  vi.setSystemTime(new Date("2030-09-10T16:59:59.999Z"));
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  vi.setSystemTime(new Date("2030-09-10T17:00:00Z"));
  await f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId, checkIn: "2030-12-20", checkOut: "2030-12-22" });
  await f.agent.mutation(api.bookings.update, { ...booking, bookingId, checkIn: "2030-12-22", checkOut: "2030-12-25", discountValue: 1000 });
  const first = await f.admin.query(api.financials.portfolio, { from: "2030-09-10", to: "2030-09-11" });
  expect(first.totals).toMatchObject({ bookingCount: 1, grossThb: 9000, discountsThb: 1000, chargedThb: 8000, commissionsThb: 800 });
  expect(first.series[0].date).toBe("2030-09-10");
  expect((await f.admin.query(api.financials.portfolio, { from: "2030-09-11", to: "2030-09-12" })).totals.bookingCount).toBe(1);
  expect((await f.admin.query(api.financials.portfolio, { from: "2030-12-01", to: "2031-01-01" })).totals.bookingCount).toBe(0);
});

it("rejects missing and malformed commission choices without changing booking or totals", async () => {
  const f = await setup();
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  const before = await f.counts();
  for (const args of [{ bookingId }, { bookingId, deleteCommission: "true" }, { deleteCommission: false }]) await expect(f.agent.mutation(api.bookings.cancel, args as never)).rejects.toThrow();
  for (const caller of [f.owner, f.other, f.t]) await expect(caller.mutation(api.bookings.cancel, { bookingId, deleteCommission: false })).rejects.toThrow();
  expect(await f.counts()).toEqual(before);
  expect((await f.admin.query(api.financials.portfolio, period)).totals.bookingCount).toBe(1);
});
