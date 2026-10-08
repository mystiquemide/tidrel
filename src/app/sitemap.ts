import type { MetadataRoute } from "next";

const BASE = "https://tidrel.midelabs.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/proof", "/safety", "/contracts", "/docs", "/terms", "/privacy"].map((path) => ({ url: `${BASE}${path}` }));
}
