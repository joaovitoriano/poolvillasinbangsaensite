import type { MutationCtx } from "../_generated/server";
import type { SessionUser } from "./access";
import type { Infer } from "convex/values";
import { auditActionValidator } from "./validators";

export async function writeAudit(ctx: MutationCtx, actor: SessionUser, action: Infer<typeof auditActionValidator>, entityType: string, entityId: string) {
  await ctx.db.insert("auditLogs", { actorWorkosUserId: actor.workosUserId, action, entityType, entityId });
}
