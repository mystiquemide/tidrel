import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev server from writing extra rule files into the repo root.
  agentRules: false,
  // The home and proof pages read live Arc mainnet data during static generation,
  // which can exceed the default 60s budget in CI. Give them more time to finish.
  staticPageGenerationTimeout: 120,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    // How it works lives on the home page. This keeps the short-lived page URL from 404ing.
    return [
      { source: "/how-it-works", destination: "/", permanent: false },
      // The docs live at /docs. The singular is what people type.
      { source: "/doc", destination: "/docs", permanent: true },
    ];
  },
};

export default nextConfig;
