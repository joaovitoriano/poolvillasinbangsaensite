import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export const GET = async () => {
  const organizationId = process.env.WORKOS_ORGANIZATION_ID;
  if (!organizationId) throw new Error("WORKOS_ORGANIZATION_ID is not configured");
  redirect(await getSignInUrl({ organizationId }));
};
