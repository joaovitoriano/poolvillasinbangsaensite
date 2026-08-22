import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";

const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });
const price = DM_Sans({ variable: "--font-price", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Pool Villas in Bangsaen",
  description: "Find private pool villas in Bang Saen for families, groups and weekend trips.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders=await headers();const requestUrl=requestHeaders.get("x-url")??"";let pathname="";try{pathname=new URL(requestUrl).pathname}catch{pathname=requestUrl}const locale=(requestHeaders.get("x-site-locale")==="th"||pathname==="/th"||pathname.startsWith("/th/"))?"th":"en";
  return <html lang={locale}><body className={`${display.variable} ${body.variable} ${mono.variable} ${price.variable}`}>{children}</body></html>;
}
