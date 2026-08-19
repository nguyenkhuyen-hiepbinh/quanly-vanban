import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents, users, processingHistory } from "@/db/schema";
import { requireSession, canAccessDepartment } from "@/lib/rbac";
import { documentUpdateSchema } from "@/lib/validators";
import { deleteUploadedFile } from "@/lib/storage";
import { documentFiles } from "@/db/schema";
import { getDocumentDetail } from "@/lib/queries";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const id = Number(params.id);
  const detail = await getDocumentDetail(id, auth.session);
  if (detail === null) {
    return NextResponse.json({ error: "Không tìm thấy văn bản." }, { status: 404 });
  }
  if (detail === "forbidden") {
    return NextResponse.json({ error: "Bạn không có quyền xem văn bản này." }, { status: 403 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN", "VANTHU", "TRUONGPHONG"]);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const db = getDb();

  const id = Number(params.id);
  const doc = await db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) {
    return NextResponse.json({ error: "Không tìm thấy văn bản." }, { status: 404 });
  }
  if (!canAccessDepartment(session, doc.departmentId)) {
    return NextResponse.json({ error: "Bạn không có quyền cập nhật văn bản này." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = documentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Trưởng phòng ban chỉ được cập nhật trạng thái xử lý, người phụ trách, ghi chú -
  // không được đổi số hiệu, phòng ban hay các trường hành chính khác.
  const restrictedForTruongPhong: (keyof typeof data)[] = [
    "trichYeu",
    "loaiVanBan",
    "soKyHieu",
    "noiGui",
    "noiNhan",
    "ngayVanBan",
    "doKhan",
    "doMat",
    "departmentId",
    "soLuuHoSo",
  ];
  if (session.role === "TRUONGPHONG") {
    for (const key of restrictedForTruongPhong) {
      if (data[key] !== undefined) {
        return NextResponse.json(
          { error: "Trưởng phòng ban không có quyền chỉnh sửa trường này." },
          { status: 403 }
        );
      }
    }
  }

  const updated = await db
    .update(documents)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, id))
    .returning()
    .get();

  if (data.status && data.status !== doc.status) {
    await db
      .insert(processingHistory)
      .values({
        documentId: id,
        userId: session.userId,
        action: "Cập nhật trạng thái",
        note: `${doc.status} → ${data.status}`,
      })
      .run();
  }
  if (data.assignedToId && data.assignedToId !== doc.assignedToId) {
    const assignee = await db.select().from(users).where(eq(users.id, data.assignedToId)).get();
    await db
      .insert(processingHistory)
      .values({
        documentId: id,
        userId: session.userId,
        action: "Phân công xử lý",
        note: assignee ? `Giao cho: ${assignee.fullName}` : undefined,
      })
      .run();
  }
  if (data.ghiChu && data.ghiChu !== doc.ghiChu) {
    await db
      .insert(processingHistory)
      .values({
        documentId: id,
        userId: session.userId,
        action: "Cập nhật ghi chú xử lý",
        note: data.ghiChu,
      })
      .run();
  }

  return NextResponse.json({ document: updated });
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const id = Number(params.id);
  const doc = await db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) {
    return NextResponse.json({ error: "Không tìm thấy văn bản." }, { status: 404 });
  }

  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.documentId, id))
    .all();
  for (const f of files) {
    await deleteUploadedFile(f.storageKey);
  }

  await db.delete(documents).where(eq(documents.id, id)).run();
  return NextResponse.json({ ok: true });
}
