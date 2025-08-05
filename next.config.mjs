/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    domains: ["app.r-tudo.com"],
    unoptimized: true,
  },
  // Ensures all assets are properly handled for Firebase Hosting
  assetPrefix: process.env.NODE_ENV === "production" ? undefined : undefined,
  // Trailing slashes help with cleaner URLs in Firebase Hosting
  trailingSlash: true,
  // Disable image optimization since we're using static export
  swcMinify: true,
  // Properly handle cross-origin requests
  crossOrigin: "anonymous",
  // Ensure proper static file handling
  reactStrictMode: true,
  // Add support for environment variables
  env: {
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "tudo-english-app",
  },
};

export default nextConfig;
