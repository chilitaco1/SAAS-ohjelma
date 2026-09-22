import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server treats 127.0.0.1 as a different origin from localhost.
  // Allow it so the browser can load the app's JavaScript from that address.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
