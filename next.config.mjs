import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// Cho phép `next dev` (dev server thường, hot-reload nhanh) truy cập được các Cloudflare
// bindings (D1, R2, ASSETS) thông qua getCloudflareContext() giống như khi chạy trên
// Cloudflare Workers thật / `wrangler dev` - xem https://opennext.js.org/cloudflare/get-started
initOpenNextCloudflareForDev();
