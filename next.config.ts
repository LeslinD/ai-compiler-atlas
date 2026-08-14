import type { NextConfig } from "next";

const isPagesBuild = process.env.PAGES_DEPLOY === "1";
const nextConfig: NextConfig = {
  // Keep the Sites build unchanged. GitHub Pages uses the same client app,
  // exported to dist/client by Vinext only inside its deployment workflow.
  ...(isPagesBuild
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
