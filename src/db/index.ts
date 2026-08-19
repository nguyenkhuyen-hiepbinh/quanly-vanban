import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Cloudflare D1 chỉ cấp binding (env.DB) theo từng request (qua getCloudflareContext()),
 * khác với better-sqlite3 trước đây có 1 kết nối singleton mở sẵn khi khởi động server.
 * Vì vậy KHÔNG cache instance drizzle ở phạm vi module - phải gọi getDb() bên trong mỗi
 * Route Handler / Server Component để luôn lấy đúng binding của request hiện tại.
 *
 * Lưu ý: gọi getDb() không tạo kết nối mạng mới (D1 không hoạt động như kết nối TCP truyền
 * thống), nên việc tạo instance mới mỗi lần gọi không tốn chi phí đáng kể.
 */
export function getDb(): DrizzleD1Database<typeof schema> {
  const { env } = getCloudflareContext();
  if (!env.DB) {
    throw new Error(
      "Thiếu binding D1 'DB'. Kiểm tra lại cấu hình wrangler.jsonc (mục d1_databases) " +
        "và đảm bảo đang chạy qua `wrangler dev` / môi trường Cloudflare Workers."
    );
  }
  return drizzle(env.DB, { schema });
}
