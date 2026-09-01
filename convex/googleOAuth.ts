import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireSuperadmin } from "./lib/access";
import { googleOAuthConfiguration, requireGoogleOAuthConfiguration } from "./lib/googleOAuthConfig";

export const getConnectionStatus = query({
  args: {},
  returns: v.object({
    status: v.union(v.literal("setup_required"), v.literal("not_connected"), v.literal("connected"), v.literal("reconnect_required")),
    connectedAt: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    if (!googleOAuthConfiguration()) return { status: "setup_required" as const };
    const connection = await ctx.db.query("googleOAuthConnections").withIndex("by_provider", (q) => q.eq("provider", "google")).unique();
    if (!connection) return { status: "not_connected" as const };
    return { status: connection.status, connectedAt: connection.connectedAt };
  },
});

export const authorizationConfig = query({
  args: {},
  returns: v.object({ clientId: v.string(), redirectUri: v.string(), connectionVersion: v.union(v.string(), v.null()) }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    const { clientId, redirectUri } = requireGoogleOAuthConfiguration();
    const connection = await ctx.db.query("googleOAuthConnections").withIndex("by_provider", (q) => q.eq("provider", "google")).unique();
    return { clientId, redirectUri, connectionVersion: connection?.credentialVersion ?? null };
  },
});
