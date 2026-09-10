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
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Cache-Control": "private, no-store", "Content-Type": "application/manifest+json" } },
  );
}
