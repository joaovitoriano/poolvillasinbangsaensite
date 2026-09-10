import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({ variable: "--font-thai", subsets: ["thai"] });

export const metadata: Metadata = {
  title: "Villa Operations",
  description: "Internal villa booking operations",
  manifest: "/ops/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Villa Operations", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
