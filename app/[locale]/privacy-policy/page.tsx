import { notFound } from "next/navigation";
import { LegalPage, legalMetadata } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "th") notFound();
  return legalMetadata("privacy-policy", locale);
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "th") notFound();
  return <LegalPage document="privacy-policy" locale={locale} />;
}
