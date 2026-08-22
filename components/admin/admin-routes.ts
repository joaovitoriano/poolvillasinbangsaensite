export const adminRoutes = {
  overview: "/admin",
  inquiries: "/admin/inquiries",
  calendar: "/admin/availability",
  villas: "/admin/villas",
  settings: "/admin/settings",
  integrations: "/admin/integrations",
  seo: "/admin/seo",
  audit: "/admin/audit",
} as const;

export type AdminView = keyof typeof adminRoutes;

export function adminViewFromPathname(pathname: string): AdminView {
  if (pathname === "/admin" || pathname === "/admin/") return "overview";
  if (pathname.startsWith("/admin/inquiries")) return "inquiries";
  if (pathname.startsWith("/admin/availability")) return "calendar";
  if (pathname.startsWith("/admin/villas")) return "villas";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/integrations")) return "integrations";
  if (pathname.startsWith("/admin/seo")) return "seo";
  if (pathname.startsWith("/admin/audit")) return "audit";
  return "overview";
}
