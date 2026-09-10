import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { requirePermission, requireVillaAccess, permissions } from "./auth";

export async function canManageClosedDate(ctx: MutationCtx, user: Doc<"operationsUsers">, closed: Doc<"closedDates">) {
  await requireVillaAccess(ctx, user, closed.villaId);
  if (user.role === "admin") requirePermission(user, permissions.bookingsManage);
  else {
    if (closed.createdByUserId !== user._id) throw new Error("You can only change your own closed dates / คุณแก้ไขได้เฉพาะวันที่ปิดของตนเอง");
    requirePermission(user, permissions.bookingsUpdateOwn);
  }
}

export async function cancelClosedDate(ctx: MutationCtx, closed: Doc<"closedDates">) {
  const nights = await ctx.db.query("closedDateNights").withIndex("by_closed_date", (q) => q.eq("closedDateId", closed._id)).take(501);
  if (nights.length > 500) throw new Error("Closed date range exceeds limit / ช่วงวันที่ปิดเกินขีดจำกัด");
  for (const night of nights) await ctx.db.delete(night._id);
  await ctx.db.patch(closed._id, { status: "cancelled", updatedAt: Date.now() });
}
