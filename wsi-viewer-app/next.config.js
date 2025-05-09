/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export', // Static HTML export for Electron
  images: {
    unoptimized: true, // Disable image optimization for static export
  },
  // Needed for static HTML export with Electron
  trailingSlash: true,
}

module.exports = nextConfig 