import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

const storedConnectionValidator = v.object({
  encryptedRefreshToken: v.string(),
  nonce: v.string(),
  encryptionVersion: v.literal(1),
  credentialVersion: v.string(),
  status: v.union(v.literal("connected"), v.literal("reconnect_required")),
});

export const getStoredConnection = internalQuery({
  args: {},
  returns: v.union(storedConnectionValidator, v.null()),
  handler: async (ctx) => {
    const connection = await ctx.db.query("googleOAuthConnections").withIndex("by_provider", (q) => q.eq("provider", "google")).unique();
    if (!connection) return null;
    return {
      encryptedRefreshToken: connection.encryptedRefreshToken,
      nonce: connection.nonce,
      encryptionVersion: connection.encryptionVersion,
      credentialVersion: connection.credentialVersion,
      status: connection.status,
    };
  },
});

export const saveConnection = internalMutation({
  args: {
    encryptedRefreshToken: v.string(), nonce: v.string(), credentialVersion: v.string(),
    expectedCredentialVersion: v.union(v.string(), v.null()), connectedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ctx.db.query("googleOAuthConnections").withIndex("by_provider", (q) => q.eq("provider", "google")).unique();
    if ((current?.credentialVersion ?? null) !== args.expectedCredentialVersion) {
      throw new ConvexError({ code: "GOOGLE_CONNECTION_CHANGED" });
    }
    const value = {
      provider: "google" as const,
      encryptedRefreshToken: args.encryptedRefreshToken,
      nonce: args.nonce,
      encryptionVersion: 1 as const,
      credentialVersion: args.credentialVersion,
      connectedAt: Date.now(),
      connectedBy: args.connectedBy,
      status: "connected" as const,
    };
    if (current) await ctx.db.replace("googleOAuthConnections", current._id, value);
    else await ctx.db.insert("googleOAuthConnections", value);
    // Commit both the credential and restart together: the callback cannot report
    // failure after a successful credential save merely because scheduling failed.
    await ctx.scheduler.runAfter(0, internal.googleCalendar.run, { full: true });
    return null;
  },
});

export const requireReconnect = internalMutation({
  args: { credentialVersion: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const current = await ctx.db.query("googleOAuthConnections").withIndex("by_provider", (q) => q.eq("provider", "google")).unique();
    if (!current || current.credentialVersion !== args.credentialVersion) return false;
    if (current.status !== "reconnect_required") await ctx.db.patch("googleOAuthConnections", current._id, { status: "reconnect_required" });
    return true;
  },
});
