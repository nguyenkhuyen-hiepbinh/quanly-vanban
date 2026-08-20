import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { academicYears } from "@/db/schema";
import { requireSession } from "@/lib/rbac";

/** Danh sách năm học - dùng cho mọi người dùng đã đăng nhập (dropdown chọn/lọc năm học). */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.name))
    .all();

  return NextResponse.json({ academicYears: list });
}
