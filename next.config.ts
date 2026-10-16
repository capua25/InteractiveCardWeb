import type { NextConfig } from "next";

// Sin cacheComponents/partialPrefetching: con Cache Components un slug
// inexistente responde 200 (streaming) en vez de 404 y no existe dynamicParams.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
