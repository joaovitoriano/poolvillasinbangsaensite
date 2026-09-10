import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

export const list = query({
  args: { page: v.number() }, returns: v.any(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Admin access required / เฉพาะผู้ดูแลเท่านั้น");
    if (!Number.isInteger(args.page) || args.page < 1 || args.page > 10) throw new Error("Invalid page / หน้าที่ระบุไม่ถูกต้อง");
    const recent = await ctx.db.query("activity").withIndex("by_createdAt").order("desc").take(200);
    const pageCount = Math.max(1, Math.ceil(recent.length / 20));
    const currentPage = Math.min(args.page, pageCount);
    return { page: recent.slice((currentPage - 1) * 20, currentPage * 20), currentPage, pageCount };
  },
});
