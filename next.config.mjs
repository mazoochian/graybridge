/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: {
    serverComponentsExternalPackages: ["pg", "@prisma/adapter-pg"],
  },
};

export default nextConfig;
