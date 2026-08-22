import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AdminRouteShell } from "@/components/admin/AdminRouteShell";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider><AdminRouteShell>{children}</AdminRouteShell></ConvexClientProvider>;
}
