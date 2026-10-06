import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // How it works lives on the home page. This keeps the short-lived page URL from 404ing.
    return [{ source: "/how-it-works", destination: "/", permanent: false }];
  },
};

export default nextConfig;
