import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { soDepartments, documents } from "@/db/schema";
import { requireSession } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);

  const inUse = await db
    .select()
    .from(documents)
    .where(eq(documents.soDepartmentId, id))
    .get();
  if (inUse) {
    return NextResponse.json(
      {
        error:
          "Phòng ban của Sở này đang được gắn cho ít nhất 1 văn bản nên không thể xoá. Có thể tắt hoạt động thay vì xoá.",
      },
      { status: 409 }
    );
  }

  await db.delete(soDepartments).where(eq(soDepartments.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);
  const body = (await req.json().catch(() => null)) as { isActive?: boolean } | null;
  if (!body || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const updated = await db
    .update(soDepartments)
    .set({ isActive: body.isActive })
    .where(eq(soDepartments.id, id))
    .returning()
    .get();

  return NextResponse.json({ soDepartment: updated });
}
