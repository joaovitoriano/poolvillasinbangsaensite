import type { Metadata } from "next";

import { FacebookGroupPage } from "@/components/FacebookGroupPage";

export const metadata: Metadata = {
  title: "Talk Directly with Villa Managers and Owners | Pool Villas in Bangsaen",
  description: "Join our Facebook group to connect directly with Bang Saen villa managers and owners.",
  alternates: {
    canonical: "/facebookgroup",
    languages: { en: "/facebookgroup", th: "/th/facebookgroup" },
  },
};

export default function FacebookGroupLandingPage() {
  return <FacebookGroupPage locale="en" />;
}
