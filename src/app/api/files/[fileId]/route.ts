import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documentFiles, documents } from "@/db/schema";
import { requireSession, canAccessDepartment } from "@/lib/rbac";
import { readUploadedFile } from "@/lib/storage";

export async function GET(_req: NextRequest, props: { params: Promise<{ fileId: string }> }) {
  const params = await props.params;
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const db = getDb();

  const fileId = Number(params.fileId);
  const file = await db.select().from(documentFiles).where(eq(documentFiles.id, fileId)).get();
  if (!file) {
    return NextResponse.json({ error: "Không tìm thấy tệp." }, { status: 404 });
  }
  const doc = await db.select().from(documents).where(eq(documents.id, file.documentId)).get();
  if (!doc || !canAccessDepartment(session, doc.departmentId)) {
    return NextResponse.json({ error: "Bạn không có quyền xem tệp này." }, { status: 403 });
  }

  try {
    const buffer = await readUploadedFile(file.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không đọc được tệp trên máy chủ." }, { status: 500 });
  }
}
