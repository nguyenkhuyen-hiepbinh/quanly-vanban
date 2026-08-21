import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { soDepartments } from "@/db/schema";
import { requireSession } from "@/lib/rbac";

/**
 * Danh sách Phòng ban CỦA SỞ đang hoạt động - dùng cho mọi người dùng đã đăng nhập (dropdown
 * chọn "Văn bản này thuộc Phòng ban nào của Sở" khi tiếp nhận văn bản đến). Khác với
 * /api/departments (đó là phòng ban NỘI BỘ trường, dùng để chuyển xử lý).
 */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db
    .select()
    .from(soDepartments)
    .where(eq(soDepartments.isActive, true))
    .orderBy(asc(soDepartments.code))
    .all();

  return NextResponse.json({ soDepartments: list });
}
