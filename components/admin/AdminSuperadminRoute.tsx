"use client";

import { AdminSuperadmin } from "./AdminSuperadmin";
import { useAdminSession } from "./AdminRouteShell";

export function AdminSuperadminRoute({ view }: { view: "settings" | "integrations" | "seo" | "audit" }) {
  const user = useAdminSession();
  return <AdminSuperadmin view={view} role={user.role} />;
}
