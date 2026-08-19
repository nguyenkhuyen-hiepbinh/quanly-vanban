import type { Config } from "drizzle-kit";

// Dùng để sinh file migration SQL (npm run db:generate) từ src/db/schema.ts.
// Không cần dbCredentials trỏ tới database thật vì migration được áp dụng lên Cloudflare D1
// qua lệnh `wrangler d1 migrations apply`, không dùng drizzle-kit push/migrate trực tiếp.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
} satisfies Config;
