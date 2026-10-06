import type { MetadataRoute } from "next";

const BASE = "https://tidrel.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/proof", "/safety", "/contracts"].map((path) => ({ url: `${BASE}${path}` }));
}
