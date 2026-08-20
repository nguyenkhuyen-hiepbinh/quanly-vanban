import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { userUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await db.select().from(users).where(eq(users.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
  }

  if (existing.id === auth.session.userId && data.isActive === false) {
    return NextResponse.json(
      { error: "Không thể tự vô hiệu hoá chính tài khoản đang đăng nhập." },
      { status: 400 }
    );
  }
  if (existing.id === auth.session.userId && data.role && data.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Không thể tự hạ quyền admin của chính mình." },
      { status: 400 }
    );
  }

  const finalRole = data.role ?? existing.role;
  const finalDept = data.departmentId !== undefined ? data.departmentId : existing.departmentId;
  if (finalRole === "TRUONGPHONG" && !finalDept) {
    return NextResponse.json(
      { error: "Trưởng phòng ban bắt buộc phải thuộc một phòng ban." },
      { status: 400 }
    );
  }

  const passwordHash = data.password ? await hashPassword(data.password) : undefined;

  const updated = await db
    .update(users)
    .set({
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
    })
    .where(eq(users.id, id))
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

  return NextResponse.json({ user: updated });
}
