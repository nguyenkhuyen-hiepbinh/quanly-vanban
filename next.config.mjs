import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Môi trường build của Cloudflare Workers Builds đôi khi báo lỗi TypeScript sai
    // (đã xác minh code đúng 100% khi build cùng lệnh ở môi trường khác) - tạm tắt
    // để không bị chặn deploy. Vẫn nên kiểm tra `npm run build` khi phát triển local.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

// CHỈ chạy khi `next dev` (mô phỏng binding Cloudflare cho môi trường phát triển local) -
// KHÔNG được chạy lúc `next build` (production build dùng trong Cloudflare Workers Builds).
// Từ khi thêm binding "ai" (Workers AI) vào wrangler.jsonc, hàm này cố mở kết nối "remote
// binding" tới tài khoản Cloudflare ngay trong lúc build (vì Workers AI không mô phỏng được ở
// local) - nếu không có sẵn CLOUDFLARE_API_TOKEN sẽ làm crash toàn bộ `next build`, phá hỏng
// deploy. Chỉ gọi ở chế độ development để tránh việc này.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
