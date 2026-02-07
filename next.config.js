/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@lancedb/lancedb", "@lancedb/lancedb-win32-x64-msvc"],
};

module.exports = nextConfig;
