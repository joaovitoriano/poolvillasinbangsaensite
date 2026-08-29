import type { Metadata } from "next";

import { FacebookGroupPage } from "@/components/FacebookGroupPage";

export const metadata: Metadata = {
  title: "คุยกับผู้จัดการและเจ้าของวิลล่าโดยตรง | พูลวิลล่าในบางแสน",
  description: "เข้าร่วมกลุ่ม Facebook เพื่อติดต่อผู้จัดการและเจ้าของพูลวิลล่าในบางแสนโดยตรง",
  alternates: {
    canonical: "/th/facebookgroup",
    languages: { en: "/facebookgroup", th: "/th/facebookgroup" },
  },
};

export default function ThaiFacebookGroupLandingPage() {
  return <FacebookGroupPage locale="th" />;
}
