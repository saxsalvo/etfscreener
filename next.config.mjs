/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the raw Yahoo Finance request URLs (with crumb tokens) that Next.js
  // logs to the terminal for every server-side fetch during development.
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
