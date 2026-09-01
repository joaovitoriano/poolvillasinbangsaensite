import { withAuth } from "@workos-inc/authkit-nextjs";
import { fetchQuery } from "convex/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { createOAuthAttempt, GOOGLE_OAUTH_PATH, GOOGLE_OAUTH_SCOPE, oauthErrorCode, setOAuthCookie, siteOrigin } from "@/lib/google-oauth-server";
import type { GoogleOAuthError } from "@/lib/google-oauth-result";

export const runtime = "nodejs";

function failure(error: GoogleOAuthError, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let origin: string;
  try { origin = siteOrigin(); } catch { return failure("setup_required", 503); }
  if (request.headers.get("origin") !== origin || request.nextUrl.origin !== origin) return failure("forbidden", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return failure("request_failed", 400);

  try {
    const session = await withAuth();
    if (!session.user || !session.accessToken) return failure("session_expired", 401);
    if (session.role !== "superadmin" && !session.roles?.includes("superadmin")) return failure("forbidden", 403);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("locale" in body) || (body.locale !== "en" && body.locale !== "th")) return failure("request_failed", 400);
    const config = await fetchQuery(api.googleOAuth.authorizationConfig, {}, { token: session.accessToken });
    if (config.redirectUri !== `${origin}${GOOGLE_OAUTH_PATH}/callback`) return failure("setup_required", 503);
    const { attempt, sealed, challenge } = createOAuthAttempt({
      userId: session.user.id,
      sessionId: session.sessionId,
      locale: body.locale,
      redirectUri: config.redirectUri,
      connectionVersion: config.connectionVersion,
    });
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: GOOGLE_OAUTH_SCOPE,
      access_type: "offline",
      prompt: "consent select_account",
      state: attempt.state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    const response = NextResponse.json({ url: authorizationUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
    setOAuthCookie(response, origin, sealed);
    return response;
  } catch (error) {
    return failure(oauthErrorCode(error), 400);
  }
}
