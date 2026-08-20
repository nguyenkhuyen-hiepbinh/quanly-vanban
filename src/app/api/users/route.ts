import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/rbac";

/** Danh sách người dùng cơ bản (không lộ mật khẩu) - dùng để chọn người phụ trách xử lý văn bản */
export async function GET(req: NextRequest) {
  const auth = await requireSession(["ADMIN", "VANTHU", "TRUONGPHONG"]);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const { searchParams } = new URL(req.url);
  const departmentIdParam = searchParams.get("departmentId");

  let departmentId: number | null = departmentIdParam ? Number(departmentIdParam) : null;
  if (session.role === "TRUONGPHONG") {
    departmentId = session.departmentId; // chỉ được xem người trong phòng ban mình
  }

  const conditions = [eq(users.isActive, true)];
  if (departmentId) conditions.push(eq(users.departmentId, departmentId));

  const db = getDb();
  const list = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      role: users.role,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(asc(users.fullName))
    .all();

  return NextResponse.json({ users: list });
}
