import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },
  async rewrites() {
    // Proxy Firebase Auth handler from our custom domain so authDomain matches
    // window.origin and signInWithRedirect/popup work without third-party cookies.
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://openhousemap.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://openhousemap.firebaseapp.com/__/firebase/:path*",
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      leaflet: require.resolve("leaflet"),
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
