import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Ứng dụng này gần như hoàn toàn là trang động (Server Component đọc D1 mỗi request,
// không có trang tĩnh cần ISR/revalidate), nên không cấu hình thêm R2 incremental cache
// để giảm độ phức tạp lúc triển khai. Có thể bật lại sau nếu cần tối ưu thêm
// (xem https://opennext.js.org/cloudflare/caching).
export default defineCloudflareConfig();
