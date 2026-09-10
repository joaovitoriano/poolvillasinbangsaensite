import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { setup, booking, period } from "./helpers";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2030-09-10T05:00:00Z")); });
afterEach(() => vi.useRealTimers());

it.each([NaN, Infinity, -Infinity, -1])("rejects invalid villa and preset prices: %s", async price => {
  const f = await setup(), before = await f.counts();
  await expect(f.admin.mutation(api.villas.create, { ...f.villaData, defaultNightlyPriceThb: price })).rejects.toThrow();
  await expect(f.admin.mutation(api.pricing.save, { villaId: f.villaId, name: "Weekend", nightlyPriceThb: price, daysOfWeek: [0, 6], isDefault: false })).rejects.toThrow();
  expect(await f.counts()).toEqual(before);
});

it("requires confirmation for conversion and rolls cancellation back if another booking conflicts", async () => {
  const f = await setup();
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  await f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId, checkIn: "2030-09-22", checkOut: "2030-09-24" });
  const args = { villaId: f.villaId, bookingId, from: "2030-09-20", to: "2030-09-22", confirmCancellation: false };
  const before = await f.counts();
  await expect(f.agent.mutation(api.closedDates.save, args)).rejects.toThrow();
  await expect(f.agent.mutation(api.closedDates.save, { ...args, confirmCancellation: true })).rejects.toThrow();
  expect(await f.counts()).toEqual(before);
  expect(await f.agent.query(api.bookings.get, { bookingId })).toMatchObject({ status: "confirmed" });
  const closedDateId = await f.agent.mutation(api.closedDates.save, { ...args, to: "2030-09-21", confirmCancellation: true });
  expect(await f.agent.query(api.bookings.get, { bookingId })).toMatchObject({ status: "cancelled" });
  expect((await f.counts()).closedNights).toBe(2);
  await expect(f.other.mutation(api.closedDates.cancel, { closedDateId })).rejects.toThrow();
  await f.agent.mutation(api.closedDates.cancel, { closedDateId });
  expect((await f.counts()).closedNights).toBe(0);
  const event = (await f.activity()).page.find(row => row.entityId === closedDateId && row.action === "cancelled");
  expect(event?.changes).toEqual(expect.arrayContaining([expect.objectContaining({ field: "from", before: "2030-09-20", after: "2030-09-20" }), expect.objectContaining({ field: "to", before: "2030-09-21", after: "2030-09-21" })]));
});

it("updates a closure as one activity event and converts it to a booking", async () => {
  const f = await setup();
  const args = { villaId: f.villaId, from: "2030-09-20", to: "2030-09-21", confirmCancellation: false };
  const closedDateId = await f.agent.mutation(api.closedDates.save, args);
  await expect(f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId })).rejects.toThrow();
  const before = (await f.counts()).activity;
  await f.agent.mutation(api.closedDates.save, { ...args, closedDateId, to: "2030-09-22", notes: "Maintenance" });
  expect((await f.counts()).activity).toBe(before + 1);
  expect((await f.activity()).page.filter(row => row.entityId === closedDateId && row.action === "cancelled")).toHaveLength(0);
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId, closedDateId });
  expect(await f.agent.query(api.closedDates.get, { closedDateId })).toMatchObject({ status: "cancelled" });
  expect(await f.agent.query(api.bookings.get, { bookingId })).toMatchObject({ status: "confirmed" });
  expect((await f.counts()).closedNights).toBe(0);
});

it("scopes financial totals by role and excludes cancelled bookings and out-of-period check-ins", async () => {
  const f = await setup();
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  await f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId, checkIn: "2030-09-22", checkOut: "2030-09-24" });
  await f.admin.mutation(api.bookings.create, { ...booking, villaId: f.secondVilla });
  expect((await f.admin.query(api.financials.portfolio, period)).totals).toMatchObject({ bookingCount: 3, chargedThb: 16500, commissionsThb: 1650, villaNetThb: 14850 });
  expect((await f.owner.query(api.financials.portfolio, period)).totals).toMatchObject({ bookingCount: 2, chargedThb: 11000 });
  expect((await f.agent.query(api.financials.portfolio, period)).totals).toEqual({ bookingCount: 1, chargedThb: 5500, commissionsThb: 550 });
  expect((await f.admin.query(api.financials.portfolio, { from: "2030-09-21", to: "2030-09-22" })).totals.bookingCount).toBe(0);
  await f.agent.mutation(api.bookings.cancel, { bookingId });
  expect((await f.agent.query(api.financials.portfolio, period)).totals.bookingCount).toBe(0);
  expect((await f.admin.query(api.financials.portfolio, period)).totals.bookingCount).toBe(2);
});

it("accepts optional empty contacts, rejects blank names, and avoids no-op activity", async () => {
  const f = await setup();
  await expect(f.agent.mutation(api.users.updateProfile, { name: " " })).rejects.toThrow();
  await f.agent.mutation(api.users.updateProfile, { name: " สมชาย ", phone: " ", lineId: "" });
  expect(await f.agent.query(api.users.current, {})).toMatchObject({ name: "สมชาย" });
  const before = (await f.counts()).activity;
  await f.agent.mutation(api.users.updateProfile, { name: "สมชาย" });
  expect((await f.counts()).activity).toBe(before);
  expect(await f.other.query(api.users.current, {})).toMatchObject({ name: "other" });
});

it("keeps recurring days and date-range pricing exclusive and uses matching rates", async () => {
  const f = await setup();
  const preset = { villaId: f.villaId, name: "Special", nightlyPriceThb: 4000, daysOfWeek: [] as number[], dateFrom: "2030-09-20", dateTo: "2030-09-20", isDefault: false };
  await expect(f.admin.mutation(api.pricing.save, { ...preset, daysOfWeek: [5] })).rejects.toThrow();
  await expect(f.admin.mutation(api.pricing.save, { ...preset, dateTo: undefined })).rejects.toThrow();
  await f.admin.mutation(api.pricing.save, preset);
  const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
  expect(await f.agent.query(api.bookings.get, { bookingId })).toMatchObject({ subtotalThb: 7000, totalChargedThb: 6500, creatorCommissionThb: 650 });
});
