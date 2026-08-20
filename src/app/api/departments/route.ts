import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { requireSession } from "@/lib/rbac";

/** Danh sách phòng ban đang hoạt động - dùng cho mọi người dùng đã đăng nhập (VD: dropdown chuyển phòng ban) */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(asc(departments.name))
    .all();

  return NextResponse.json({ departments: list });
}
