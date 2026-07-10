import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/projects/:id", destination: "/projects/:id/canvas", permanent: false },
      { source: "/gallery", destination: "/", permanent: false },
      { source: "/inspiration", destination: "/", permanent: false },
      { source: "/styles", destination: "/", permanent: false },
      { source: "/settings", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
