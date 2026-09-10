import { authkit, handleAuthkitHeaders } from "@workos-inc/authkit-nextjs";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  const result = await authkit(request, { eagerAuth: true });
  const pathname = request.nextUrl.pathname;
  const publicRoute = pathname === "/ops/sign-in" || pathname === "/ops/auth/callback" || pathname === "/ops/manifest.webmanifest";
  if (!publicRoute && !result.session.user) {
    return handleAuthkitHeaders(request, result.headers, { redirect: "/ops/sign-in" });
  }
  return handleAuthkitHeaders(request, result.headers);
}

export const config = { runtime: "nodejs", matcher: ["/ops/:path*"] };
