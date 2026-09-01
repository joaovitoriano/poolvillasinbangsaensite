"use node";

import { randomUUID } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { requireSuperadmin } from "./lib/access";
import { GOOGLE_CALENDAR_SCOPE, requireGoogleOAuthConfiguration } from "./lib/googleOAuthConfig";
import { encryptRefreshToken, requestGoogleToken } from "./lib/googleOAuthTokens";

export const completeAuthorization = action({
  args: { code: v.string(), codeVerifier: v.string(), redirectUri: v.string(), expectedConnectionVersion: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperadmin(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_INVALID" });
    const configuration = requireGoogleOAuthConfiguration();
    if (
      args.redirectUri !== configuration.redirectUri || !args.code || args.code.length > 4096 ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(args.codeVerifier)
    ) throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_INVALID" });
    const current = await ctx.runQuery(internal.googleOAuthData.getStoredConnection, {});
    if ((current?.credentialVersion ?? null) !== args.expectedConnectionVersion) throw new ConvexError({ code: "GOOGLE_CONNECTION_CHANGED" });
    const { ok, data } = await requestGoogleToken({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      code: args.code,
      code_verifier: args.codeVerifier,
      redirect_uri: configuration.redirectUri,
      grant_type: "authorization_code",
    });
    if (!ok) {
      if (data.error === "invalid_grant") throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_INVALID" });
      if (data.error === "invalid_client" || data.error === "unauthorized_client") throw new ConvexError({ code: "GOOGLE_SETUP_REQUIRED" });
      throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
    }
    if (!data.access_token) throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
    if (!data.scope?.split(/\s+/).includes(GOOGLE_CALENDAR_SCOPE)) throw new ConvexError({ code: "GOOGLE_SCOPE_REQUIRED" });
    if (!data.refresh_token) throw new ConvexError({ code: "GOOGLE_REFRESH_TOKEN_MISSING" });
    const { calendars } = await ctx.runQuery(internal.calendarSyncData.getSyncState, {});
    // Bound concurrency and total preflight time so the callback stays within
    // its request deadline, even when more villa calendars are configured.
    const preflightDeadline = AbortSignal.timeout(20_000);
    for (let offset = 0; offset < calendars.length; offset += 5) {
      await Promise.all(calendars.slice(offset, offset + 5).map(async ({ villa }) => {
        // Check calendar access without fetching events or retaining metadata.
        let response: Response;
        try {
          response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(villa.googleCalendarId!)}?fields=id`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
            signal: preflightDeadline,
          });
        } catch {
          throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
        }
        if (response.status === 403 || response.status === 404) throw new ConvexError({ code: "GOOGLE_CALENDAR_ACCESS_REQUIRED" });
        if (!response.ok) throw new ConvexError({ code: "GOOGLE_AUTHORIZATION_FAILED" });
      }));
    }
    const encrypted = encryptRefreshToken(data.refresh_token);
    await ctx.runMutation(internal.googleOAuthData.saveConnection, {
      ...encrypted,
      credentialVersion: randomUUID(),
      expectedCredentialVersion: args.expectedConnectionVersion,
      connectedBy: identity.tokenIdentifier,
    });
    return null;
  },
});
