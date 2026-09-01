import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ConvexError } from "convex/values";
import { NextResponse, type NextRequest } from "next/server";
import type { GoogleOAuthError } from "./google-oauth-result";

export const GOOGLE_OAUTH_PATH = "/admin/integrations/google";
export const GOOGLE_OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const ATTEMPT_SECONDS = 10 * 60;

type OAuthAttempt = {
  state: string;
  codeVerifier: string;
  userId: string;
  sessionId: string;
  redirectUri: string;
  connectionVersion: string | null;
  locale: "en" | "th";
  expiresAt: number;
};

export function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new Error("Google OAuth site origin is not configured");
  const url = new URL(value);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Google OAuth site origin is invalid");
  }
  return url.origin;
}

function cookieName(origin: string) {
  return origin.startsWith("https:") ? "__Host-pv-google-oauth" : "pv-google-oauth";
}

function cookieKey() {
  const secret = process.env.WORKOS_COOKIE_PASSWORD;
  if (!secret || secret.length < 32) throw new Error("Google OAuth cookie secret is not configured");
  return createHash("sha256").update("poolvillas-google-oauth-cookie-v1\0").update(secret).digest();
}

function cookieOptions(origin: string) {
  return { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/" };
}

export function createOAuthAttempt(input: Omit<OAuthAttempt, "state" | "codeVerifier" | "expiresAt">) {
  const attempt: OAuthAttempt = {
    ...input,
    state: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(48).toString("base64url"),
    expiresAt: Date.now() + ATTEMPT_SECONDS * 1000,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(attempt), "utf8"), cipher.final()]);
  const sealed = [iv, ciphertext, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
  return { attempt, sealed, challenge: createHash("sha256").update(attempt.codeVerifier).digest("base64url") };
}

export function setOAuthCookie(response: NextResponse, origin: string, sealed: string) {
  response.cookies.set(cookieName(origin), sealed, { ...cookieOptions(origin), maxAge: ATTEMPT_SECONDS });
}

export function readOAuthAttempt(request: NextRequest, origin: string): OAuthAttempt | null {
  try {
    const value = request.cookies.get(cookieName(origin))?.value;
    if (!value || value.length > 4096) return null;
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const [iv, ciphertext, tag] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", cookieKey(), iv);
    decipher.setAuthTag(tag);
    const parsed: unknown = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const item = parsed as Record<string, unknown>;
    if (typeof item.state !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(item.state)
      || typeof item.codeVerifier !== "string" || !/^[A-Za-z0-9_-]{64}$/.test(item.codeVerifier)
      || typeof item.userId !== "string" || typeof item.sessionId !== "string"
      || item.redirectUri !== `${origin}${GOOGLE_OAUTH_PATH}/callback`
      || (item.connectionVersion !== null && typeof item.connectionVersion !== "string")
      || (item.locale !== "en" && item.locale !== "th")
      || typeof item.expiresAt !== "number" || !Number.isFinite(item.expiresAt)
      || item.expiresAt <= Date.now() || item.expiresAt > Date.now() + ATTEMPT_SECONDS * 1000) return null;
    return item as OAuthAttempt;
  } catch {
    return null;
  }
}

export function matchesOAuthState(expected: string, received: string | null) {
  if (!received || !/^[A-Za-z0-9_-]{43}$/.test(received) || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function oauthReturn(origin: string, result: GoogleOAuthError | "connected", locale: "en" | "th" = "en") {
  const url = new URL("/admin/integrations", origin);
  url.searchParams.set("google", result);
  url.searchParams.set("lang", locale);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(cookieName(origin), "", { ...cookieOptions(origin), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export function oauthErrorCode(error: unknown): GoogleOAuthError {
  if (!(error instanceof ConvexError) || !error.data || typeof error.data !== "object") return "authorization_failed";
  const code = (error.data as Record<string, unknown>).code;
  switch (code) {
    case "GOOGLE_SETUP_REQUIRED": return "setup_required";
    case "GOOGLE_SCOPE_REQUIRED": return "scope_required";
    case "GOOGLE_CALENDAR_ACCESS_REQUIRED": return "calendar_access_required";
    case "GOOGLE_CONNECTION_CHANGED": return "connection_changed";
    default: return "authorization_failed";
  }
}
