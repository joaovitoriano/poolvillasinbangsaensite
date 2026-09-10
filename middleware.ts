import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = pathname === "/" || pathname === "/th" || pathname.startsWith("/th/") ? "th" : "en";
  const requiresAuth =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/sign-in" ||
    pathname.startsWith("/auth/");

  if (requiresAuth) {
    const { authkit, handleAuthkitHeaders } = await import(
      "@workos-inc/authkit-nextjs"
    );
    const result = await authkit(request, { eagerAuth: true });
    result.headers.set("x-site-locale", locale);
    return handleAuthkitHeaders(request, result.headers);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/th/:path*", "/admin/:path*", "/sign-in", "/auth/:path*"],
};
