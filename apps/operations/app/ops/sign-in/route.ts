import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const GET = async () => {
  const organizationId = process.env.WORKOS_OPERATIONS_ORGANIZATION_ID;
  const locale = (await cookies()).get("villa-operations-locale")?.value === "th" ? "th" : "en";
  if (!organizationId) throw new Error(locale === "th" ? "ยังไม่ได้ตั้งค่าองค์กรสำหรับระบบจัดการ" : "Operations organization is not configured");
  redirect(await getSignInUrl({ organizationId }));
};
