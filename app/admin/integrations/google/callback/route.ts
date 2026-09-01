import { withAuth } from "@workos-inc/authkit-nextjs";
import { fetchAction } from "convex/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { matchesOAuthState, oauthErrorCode, oauthReturn, readOAuthAttempt, siteOrigin } from "@/lib/google-oauth-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  let origin: string;
  try { origin = siteOrigin(); } catch {
    return NextResponse.json({ error: "setup_required" }, { status: 503, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
  const attempt = readOAuthAttempt(request, origin);
  if (request.nextUrl.origin !== origin || !attempt || !matchesOAuthState(attempt.state, request.nextUrl.searchParams.get("state"))) {
    return oauthReturn(origin, "invalid_state", attempt?.locale);
  }
  try {
    const session = await withAuth();
    if (!session.user || !session.accessToken || session.user.id !== attempt.userId || session.sessionId !== attempt.sessionId) {
      return oauthReturn(origin, "session_expired", attempt.locale);
    }
    if (session.role !== "admin" && session.role !== "superadmin" && !session.roles?.includes("admin") && !session.roles?.includes("superadmin")) return oauthReturn(origin, "forbidden", attempt.locale);
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) return oauthReturn(origin, providerError === "access_denied" ? "cancelled" : "authorization_failed", attempt.locale);
    const code = request.nextUrl.searchParams.get("code");
    if (!code || code.length > 4096) return oauthReturn(origin, "authorization_failed", attempt.locale);
    await fetchAction(api.googleOAuthActions.completeAuthorization, {
      code,
      codeVerifier: attempt.codeVerifier,
      redirectUri: attempt.redirectUri,
      expectedConnectionVersion: attempt.connectionVersion,
    }, { token: session.accessToken });
    return oauthReturn(origin, "connected", attempt.locale);
  } catch (error) {
    return oauthReturn(origin, oauthErrorCode(error), attempt.locale);
  }
}
