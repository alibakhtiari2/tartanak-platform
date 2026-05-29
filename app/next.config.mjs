/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow /_next/* static assets to be loaded when the page is served
  // through a reverse proxy on a different hostname (e.g. pc100.skycode.win,
  // pc77.skycode.win, or any custom domain via the ALLOWED_ORIGINS env var).
  allowedDevOrigins: [
    "*.skycode.win",
    "localhost",
    "127.0.0.1",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()) : []),
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "snapfoodimages.s3.eu-central-1.amazonaws.com"
      }
    ]
  }
};

export default nextConfig;
