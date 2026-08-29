import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { headers } from "next/headers";
import { PwaRegistration } from "@/components/PwaRegistration";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });
const price = DM_Sans({ variable: "--font-price", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "Pool Villas in Bangsaen | พูลวิลล่าในบางแสน",
  title: "Pool Villas in Bangsaen",
  description: "Find private pool villas in Bang Saen for families, groups and weekend trips.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pool Villas | พูลวิลล่า",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07334a",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders=await headers();const requestUrl=requestHeaders.get("x-url")??"";let pathname="";try{pathname=new URL(requestUrl).pathname}catch{pathname=requestUrl}const locale=(requestHeaders.get("x-site-locale")==="th"||pathname==="/th"||pathname.startsWith("/th/"))?"th":"en";
  return <html lang={locale}><body className={`${display.variable} ${body.variable} ${mono.variable} ${price.variable}`}>{children}<PwaRegistration /><Analytics /></body></html>;
}
