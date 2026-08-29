import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const origin=(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
  const villas=await fetchQuery(api.villas.listSlugs,{});
  const staticPages=["/en","/th","/en/villas","/th/villas","/en/policies","/th/policies","/facebookgroup","/th/facebookgroup"].map(url=>({url:`${origin}${url}`,changeFrequency:"daily" as const,priority:url.endsWith("policies")?.5:url.endsWith("villas")?.9:url.endsWith("facebookgroup")?.7:1}));
  return [...staticPages,...villas.flatMap(villa=>["en","th"].map(locale=>({url:`${origin}/${locale}/villas/${villa.slug}`,lastModified:new Date(villa.updatedAt),changeFrequency:"weekly" as const,priority:.8})))];
}
