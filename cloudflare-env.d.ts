// Khai báo kiểu cho các Cloudflare bindings (D1, R2, Assets, biến môi trường) dùng trong
// getCloudflareContext().env. File này merge (declaration merging) với interface CloudflareEnv
// gốc do @opennextjs/cloudflare khai báo.
//
// LƯU Ý CHO ĐỘI CNTT: sau khi tạo D1 database + R2 bucket thật trên Cloudflare và cập nhật
// wrangler.jsonc, nên chạy `npx wrangler types` để Cloudflare tự sinh lại file này chính xác
// theo cấu hình - file hiện tại được viết tay để khớp với wrangler.jsonc trong repo.
declare global {
  interface CloudflareEnv {
    // D1 - cơ sở dữ liệu chính của ứng dụng
    DB: D1Database;
    // R2 - lưu trữ file văn bản đến/đi (bản gốc + bản đã đóng dấu)
    VANBAN_BUCKET: R2Bucket;
    // Assets tĩnh (public/) - dùng để nạp font đóng dấu PDF lúc runtime
    ASSETS: Fetcher;
    // Biến môi trường / secret
    AUTH_SECRET: string;
    // Cloudflare Workers AI - dùng cho tính năng "Tự động điền từ ảnh" (xem src/lib/extract.ts).
    // Không phải secret, không cần cấu hình gì thêm ngoài khai báo "ai" trong wrangler.jsonc.
    AI: Ai;
  }
}

export {};
