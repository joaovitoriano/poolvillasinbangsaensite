import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { setup, booking, period } from "./helpers";
import type { FunctionArgs } from "convex/server";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2030-09-10T05:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("booking validation and atomicity", () => {
  it("calculates commission after discount and remembers per-user/villa preferences", async () => {
    const f = await setup();
    const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
    const saved = await f.agent.query(api.bookings.get, { bookingId });
    expect(saved).toMatchObject({ subtotalThb: 6000, totalChargedThb: 5500, creatorCommissionThb: 550, villaNetThb: 4950 });
    expect(saved?.nights).toHaveLength(2);
    expect(await f.agent.query(api.commissionPreferences.get, { villaId: f.villaId })).toMatchObject({ mode: "percentage", value: 10 });
    expect(await f.other.query(api.commissionPreferences.get, { villaId: f.villaId })).toBeNull();
  });
  it.each(["villaId", "guestName", "guestPhone", "checkIn", "checkOut", "discountMode", "discountValue", "commissionMode", "commissionValue"])("rejects missing %s without writes", async field => {
    const f = await setup(), before = await f.counts();
    const args: Record<string, unknown> = { ...booking, villaId: f.villaId }; delete args[field];
    await expect(f.agent.mutation(api.bookings.create, args as FunctionArgs<typeof api.bookings.create>)).rejects.toThrow();
    expect(await f.counts()).toEqual(before);
  });
  it.each([
    { guestName: " " }, { checkIn: "2030-09-01" }, { checkOut: "2030-09-20" }, { checkOut: "2030-02-30" },
    { checkOut: "2031-01-01" }, { discountValue: -1 }, { discountValue: 6001 }, { commissionValue: -1 }, { commissionValue: 101 },
    { discountValue: "500" }, { commissionValue: null }, { commissionMode: "random" }, { extraField: true },
    { discountValue: NaN }, { discountValue: Infinity }, { commissionValue: Infinity },
  ])("rejects invalid input %j without side effects", async patch => {
    const f = await setup(), before = await f.counts();
    await expect(f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId, ...patch } as FunctionArgs<typeof api.bookings.create>)).rejects.toThrow();
    expect(await f.counts()).toEqual(before);
  });
  it("allows zero commission and adjacent bookings but rejects overlaps", async () => {
    const f = await setup();
    await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId, commissionValue: 0 });
    const before = await f.counts();
    await expect(f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId })).rejects.toThrow();
    expect(await f.counts()).toEqual(before);
    await f.other.mutation(api.bookings.create, { ...booking, villaId: f.villaId, checkIn: booking.checkOut, checkOut: "2030-09-23" });
  });
});

describe("access control and privacy", () => {
  it("rejects unauthenticated, foreign-organization and inactive callers", async () => {
    const f = await setup();
    await expect(f.t.query(api.villas.listAccessible, {})).rejects.toThrow();
    await expect(f.t.withIdentity({ ...f.identity("agent"), org_id: "wrong" }).query(api.villas.listAccessible, {})).rejects.toThrow();
    await f.t.run(ctx => ctx.db.patch(f.users[2], { active: false }));
    await expect(f.agent.query(api.villas.listAccessible, {})).rejects.toThrow();
  });
  it("masks other guests while allowing calendar and read-only booking access", async () => {
    const f = await setup();
    const { bookingId } = await f.agent.mutation(api.bookings.create, { ...booking, villaId: f.villaId });
    const other = await f.other.query(api.bookings.get, { bookingId });
    if (!other) throw new Error("Expected a visible booking");
    expect(other.canEdit).toBe(false); expect(other.contactsHidden).toBe(true);
    expect(other.guestId).toBeUndefined(); expect(JSON.stringify(other)).not.toContain(booking.guestPhone); expect(JSON.stringify(other)).not.toContain(booking.guestLineId);
    const list = await f.other.query(api.bookings.listForVilla, { villaId: f.villaId, ...period });
    expect(list).toHaveLength(1); expect(JSON.stringify(list)).not.toContain(booking.guestPhone);
    expect((await f.other.query(api.calendar.range, { villaId: f.villaId, from: "2030-09-01", to: "2030-10-01" })).bookings[0]._id).toBe(bookingId);
    expect(await f.other.query(api.guests.search, { name: "Araya" })).toEqual([]);
    expect(await f.agent.query(api.guests.search, { name: "Araya" })).toHaveLength(1);
    const before = await f.counts();
    await expect(f.other.mutation(api.bookings.update, { ...booking, bookingId, notes: "Hijack" })).rejects.toThrow();
    await expect(f.other.mutation(api.bookings.cancel, { bookingId, deleteCommission: true })).rejects.toThrow();
    expect(await f.counts()).toEqual(before);
  });
  it.each(["owner", "agent"] as const)("limits %s to assigned villas", async role => {
    const f = await setup(), caller = f[role];
    expect(await caller.query(api.villas.listAccessible, {})).toHaveLength(1);
    await expect(caller.query(api.villas.get, { villaId: f.secondVilla })).rejects.toThrow();
    await expect(caller.query(api.calendar.range, { villaId: f.secondVilla, from: "2030-09-01", to: "2030-10-01" })).rejects.toThrow();
    await expect(caller.mutation(api.bookings.create, { ...booking, villaId: f.secondVilla })).rejects.toThrow();
    await expect(caller.query(api.activity.list, { page: 1 })).rejects.toThrow();
    await expect(caller.query(api.team.listForVilla, { villaId: f.villaId })).rejects.toThrow();
    await expect(caller.mutation(api.villas.create, f.villaData)).rejects.toThrow();
  });
  it("forbids agent villa financials and settings mutations", async () => {
    const f = await setup();
    await expect(f.agent.query(api.financials.villa, { villaId: f.villaId, ...period })).rejects.toThrow();
    await expect(f.agent.mutation(api.villas.update, { villaId: f.villaId, name: "Changed", contactName: "", contactPhone: "", contactLineId: "" })).rejects.toThrow();
  });
});
