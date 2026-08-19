import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, departments } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { userCreateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

const SAFE_USER_COLUMNS = {
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  email: users.email,
  role: users.role,
  departmentId: users.departmentId,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  createdAt: users.createdAt,
  departmentName: departments.name,
};

export async function GET() {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db
    .select(SAFE_USER_COLUMNS)
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .orderBy(asc(users.fullName))
    .all();

  return NextResponse.json({ users: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.role === "TRUONGPHONG" && !data.departmentId) {
    return NextResponse.json(
      { error: "Trưởng phòng ban bắt buộc phải thuộc một phòng ban." },
      { status: 400 }
    );
  }

  const existing = await db.select().from(users).where(eq(users.username, data.username)).get();
  if (existing) {
    return NextResponse.json({ error: "Tên đăng nhập đã tồn tại." }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const created = await db
    .insert(users)
    .values({
      username: data.username,
      passwordHash,
      fullName: data.fullName,
      email: data.email || null,
      role: data.role,
      departmentId: data.departmentId ?? null,
      mustChangePassword: true,
    })
    .returning({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      isActive: users.isActive,
    })
    .get();

  return NextResponse.json({ user: created }, { status: 201 });
}
