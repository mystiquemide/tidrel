import type { MetadataRoute } from "next";

const BASE = "https://tidrel.midelabs.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/proof", "/safety", "/contracts"].map((path) => ({ url: `${BASE}${path}` }));
}
