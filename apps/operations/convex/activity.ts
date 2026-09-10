import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const list = query({
  args: { paginationOpts: paginationOptsValidator }, returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    return ctx.db.query("activity").withIndex("by_createdAt").order("desc").paginate(args.paginationOpts);
  },
});
