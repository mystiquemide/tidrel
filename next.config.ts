import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev tooling would otherwise write agent rule files into the repo root.
  agentRules: false,
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
    return [{ source: "/how-it-works", destination: "/", permanent: false }];
  },
};

export default nextConfig;
