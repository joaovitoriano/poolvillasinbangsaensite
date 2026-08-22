import { redirect } from "next/navigation";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { adminRoutes, type AdminView } from "@/components/admin/admin-routes";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string; lang?: string }> }) {
  const params = await searchParams;
  if (params.view) {
    const destination = params.view in adminRoutes ? adminRoutes[params.view as AdminView] : adminRoutes.overview;
    redirect(params.lang === "en" || params.lang === "th" ? `${destination}?lang=${params.lang}` : destination);
  }
  return <AdminOverview />;
}
