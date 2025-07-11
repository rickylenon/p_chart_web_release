/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable standalone output for deployment
  output: "standalone",

  // External packages for server components (correct property name)
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcrypt"],
  },

  // Add env variables for logging and authentication
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_DEBUG: process.env.NEXTAUTH_DEBUG,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_DEPLOYMENT_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_DEPLOYMENT_URL || "http://localhost:3000",
    NEXTAUTH_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000",
  },

  // Add additional rewrites for auth endpoints
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
