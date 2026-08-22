import { v } from "convex/values";
import { query } from "./_generated/server";
import { assertDateRange } from "./lib/dates";
import { requireAdmin } from "./lib/access";
import { relevantAvailabilityBlocks } from "./lib/boundedData";
import { availabilityBlockDocumentValidator } from "./lib/documentValidators";

const calendarBlockValidator = v.object({
  ...availabilityBlockDocumentValidator.fields,
  source: v.literal("google"),
});

export const portfolioVillas = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("villas"),
    nameEn: v.string(),
    nameTh: v.string(),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const villas = await ctx.db.query("villas").withIndex("by_sortOrder").take(100);
    return villas
      .filter((villa) => villa.status !== "archived")
      .map((villa) => ({ _id: villa._id, nameEn: villa.nameEn, nameTh: villa.nameTh }));
  },
});

export const portfolioBlocks = query({
  args: { villaIds: v.array(v.id("villas")), from: v.string(), to: v.string() },
  returns: v.array(v.object({
    villaId: v.id("villas"),
    blocks: v.array(calendarBlockValidator),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.villaIds.length > 100) {
      throw new Error("Too many villas to display safely. / มีวิลล่ามากเกินกว่าจะแสดงได้อย่างปลอดภัย");
    }
    assertDateRange(args.from, args.to);
    return await Promise.all(args.villaIds.map(async (villaId) => ({
      villaId,
      blocks: (await relevantAvailabilityBlocks(ctx, villaId, args.to))
        .filter((row) => row.endDate > args.from)
        .map((row) => ({ ...row, source: "google" as const })),
    })));
  },
});
