import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { departments, users, documents } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { departmentUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  const parsed = departmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const existing = await db.select().from(departments).where(eq(departments.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy phòng ban." }, { status: 404 });
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const dup = await db
      .select()
      .from(departments)
      .where(eq(departments.code, parsed.data.code))
      .get();
    if (dup) {
      return NextResponse.json({ error: "Mã phòng ban đã tồn tại." }, { status: 409 });
    }
  }

  const updated = await db
    .update(departments)
    .set({
      ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    })
    .where(eq(departments.id, id))
    .returning()
    .get();

  return NextResponse.json({ department: updated });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);

  const inUseByUser = await db.select().from(users).where(eq(users.departmentId, id)).get();
  const inUseByDoc = await db
    .select()
    .from(documents)
    .where(eq(documents.departmentId, id))
    .get();

  if (inUseByUser || inUseByDoc) {
    // Không xoá cứng nếu đã có dữ liệu liên quan - chỉ vô hiệu hoá để tránh mất liên kết dữ liệu
    const updated = await db
      .update(departments)
      .set({ isActive: false })
      .where(eq(departments.id, id))
      .returning()
      .get();
    return NextResponse.json({
      department: updated,
      note: "Phòng ban đang có người dùng hoặc văn bản liên quan nên chỉ được vô hiệu hoá, không xoá hẳn.",
    });
  }

  await db.delete(departments).where(eq(departments.id, id)).run();
  return NextResponse.json({ ok: true });
}
