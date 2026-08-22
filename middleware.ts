import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminRoutes, type AdminView } from "@/components/admin/admin-routes";

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const legacyAdminView = pathname === "/admin" ? request.nextUrl.searchParams.get("view") : null;
  if (legacyAdminView) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyAdminView in adminRoutes ? adminRoutes[legacyAdminView as AdminView] : adminRoutes.overview;
    redirectUrl.searchParams.delete("view");
    return NextResponse.redirect(redirectUrl, 308);
  }
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
  matcher: ["/th/:path*", "/admin/:path*", "/sign-in", "/auth/:path*"],
};
