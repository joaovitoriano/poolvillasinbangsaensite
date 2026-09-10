import { cookies } from "next/headers";

export async function GET() {
  const locale = (await cookies()).get("villa-operations-locale")?.value === "th" ? "th" : "en";
  return Response.json(
    {
      name: locale === "th" ? "ระบบจัดการวิลล่า" : "Villa Operations",
      short_name: locale === "th" ? "จัดการวิลล่า" : "Villa Ops",
      description: locale === "th" ? "ระบบจัดการการจองวิลล่าภายใน" : "Internal villa booking operations",
      start_url: "/ops/overview",
      scope: "/ops/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [{ src: "/ops-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    { headers: { "Cache-Control": "private, no-store", "Content-Type": "application/manifest+json" } },
  );
}
