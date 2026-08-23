import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { LineContactButton } from "@/components/LineContactButton";
import { api } from "@/convex/_generated/api";
import { lineContactUrl } from "@/convex/lib/line";

export default async function LocalizedSiteLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "th") notFound();

  const settings = await fetchQuery(api.settings.getPublic, {}).catch(() => null);
  const lineUrl = lineContactUrl(settings?.lineId ?? "");

  return (
    <>
      {children}
      {lineUrl ? <LineContactButton href={lineUrl} locale={locale} /> : null}
    </>
  );
}
