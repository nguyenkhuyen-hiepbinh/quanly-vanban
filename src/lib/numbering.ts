import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { DocType } from "@/db/schema";

/**
 * Sinh số thứ tự tiếp theo (Số đến / Số đi) cho một năm + loại văn bản.
 *
 * Cloudflare D1 không hỗ trợ transaction tương tác (interactive transaction) như
 * better-sqlite3, nên không thể dùng db.transaction(tx => {...}) như trước. Thay vào đó
 * dùng 1 câu lệnh SQL nguyên tử duy nhất (INSERT ... ON CONFLICT DO UPDATE ... RETURNING)
 * để đảm bảo không bị trùng số khi nhiều người thao tác đồng thời - toàn bộ đọc/ghi diễn ra
 * trong một lần round-trip tới D1, không có khoảng hở giữa đọc và ghi.
 */
export async function getNextSequenceNumber(
  type: DocType,
  year: number
): Promise<number> {
  const db = getDb();
  const row = await db.get<{ last_number: number }>(sql`
    INSERT INTO counters (type, year, last_number)
    VALUES (${type}, ${year}, 1)
    ON CONFLICT(type, year)
    DO UPDATE SET last_number = last_number + 1
    RETURNING last_number
  `);
  if (!row) {
    throw new Error("Không sinh được số thứ tự văn bản (counters).");
  }
  return row.last_number;
}
