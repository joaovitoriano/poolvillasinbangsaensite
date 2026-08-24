import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

const MAX_RELEVANT_BLOCKS = 200;
const MAX_RELEVANT_RATES = 100;

export async function relevantAvailabilityBlocks(
  ctx: ReadCtx,
  villaId: Id<"villas">,
  checkIn: string,
  checkOut: string,
): Promise<Doc<"availabilityBlocks">[]> {
  const rows = await ctx.db
    .query("availabilityBlocks")
    .withIndex("by_villaId_and_endDate", (q) => q.eq("villaId", villaId).gt("endDate", checkIn))
    .take(MAX_RELEVANT_BLOCKS + 1);
  if (rows.length > MAX_RELEVANT_BLOCKS) {
    throw new Error(
      "Availability history is too large to verify safely. Ask an administrator to archive old blocks. / ประวัติวันไม่ว่างมีจำนวนมากเกินกว่าจะตรวจสอบได้อย่างปลอดภัย โปรดติดต่อผู้ดูแลให้เก็บบล็อกเก่า",
    );
  }
  return rows.filter((row) => row.startDate < checkOut);
}

export async function relevantSpecialRates(
  ctx: ReadCtx,
  villaId: Id<"villas">,
  checkOut: string,
): Promise<Doc<"specialRates">[]> {
  const rows = await ctx.db
    .query("specialRates")
    .withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villaId))
    .take(MAX_RELEVANT_RATES + 1);
  if (rows.length > MAX_RELEVANT_RATES) {
    throw new Error(
      "Pricing history is too large to quote safely. Ask an administrator to archive old rates. / ประวัติราคามีจำนวนมากเกินกว่าจะคำนวณได้อย่างปลอดภัย โปรดติดต่อผู้ดูแลให้เก็บราคาเก่า",
    );
  }
  return rows.filter((rate) => rate.recurringDay === "sunday" || rate.startDate < checkOut);
}
