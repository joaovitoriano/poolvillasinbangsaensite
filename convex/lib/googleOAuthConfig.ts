import { ConvexError } from "convex/values";
import { env } from "../_generated/server";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_OAUTH_CALLBACK_PATH = "/admin/integrations/google/callback";

export function googleOAuthConfiguration() {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const encryptionKey = env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();
  const siteUrl = env.PUBLIC_SITE_URL?.trim();
  if (!clientId || !clientSecret || !encryptionKey || !siteUrl) return null;
  // A canonical base64 encoding of exactly 32 bytes. The Node helper also
  // validates the decoded key before using it.
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encryptionKey)) return null;
  try {
    if (btoa(atob(encryptionKey)) !== encryptionKey) return null;
    const base = new URL(siteUrl);
    const local = base.hostname === "localhost" || base.hostname === "127.0.0.1" || base.hostname === "[::1]";
    if (base.protocol !== "https:" && !(base.protocol === "http:" && local)) return null;
    if (base.username || base.password || base.search || base.hash || base.pathname !== "/") return null;
    return { clientId, clientSecret, encryptionKey, redirectUri: `${base.origin}${GOOGLE_OAUTH_CALLBACK_PATH}` };
  } catch {
    return null;
  }
}

export function requireGoogleOAuthConfiguration() {
  const configuration = googleOAuthConfiguration();
  if (!configuration) throw new ConvexError({ code: "GOOGLE_SETUP_REQUIRED" });
  return configuration;
}
