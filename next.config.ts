import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next from tracing into the Firebase functions tree
  outputFileTracingExcludes: {
    "*": [
      "**/firebase-functions/**",
      "firebase-functions/**",
      "firebase-functions/node_modules/**",
      "**/functions/**",
      "functions/**",
      "functions/node_modules/**",
      "functions/node_modules/appointmentdemo/**",
    ],
  },
  // Provide a minimal turbopack config to silence Next's error when webpack key is present
  turbopack: {},
  webpack(config) {
    // Ensure file watcher ignores the functions workspace entirely
    const ignored = (config.watchOptions as any)?.ignored ?? [];
    const ignoredArr = Array.isArray(ignored) ? ignored : [ignored].filter(Boolean);
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        ...ignoredArr,
        "**/firebase-functions/**",
        "firebase-functions/**",
        "firebase-functions/node_modules/**",
        "**/functions/**",
        "functions/**",
        "functions/node_modules/**",
        "functions/node_modules/appointmentdemo/**",
      ],
    } as any;
    return config;
  },
};

export default nextConfig;
