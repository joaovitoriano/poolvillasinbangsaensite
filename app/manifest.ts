import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pool Villas in Bangsaen | พูลวิลล่าในบางแสน",
    short_name: "Pool Villas | พูลวิลล่า",
    description:
      "Find private pool villas in Bang Saen. ค้นหาพูลวิลล่าส่วนตัวในบางแสน",
    start_url: "/th",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#07334a",
    orientation: "any",
    lang: "th",
    categories: ["travel"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
