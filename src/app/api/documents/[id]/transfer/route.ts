import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents, departments, processingHistory } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { transferSchema } from "@/lib/validators";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireSession(["ADMIN", "VANTHU"]);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const db = getDb();

  const id = Number(params.id);
  const doc = await db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) {
    return NextResponse.json({ error: "Không tìm thấy văn bản." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const dept = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.data.departmentId))
    .get();
  if (!dept) {
    return NextResponse.json({ error: "Phòng ban không tồn tại." }, { status: 400 });
  }

  const updated = await db
    .update(documents)
    .set({
      departmentId: dept.id,
      status: "DA_CHUYEN",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, id))
    .returning()
    .get();

  await db
    .insert(processingHistory)
    .values({
      documentId: id,
      userId: session.userId,
      action: "Chuyển phòng ban xử lý",
      note: `Chuyển tới: ${dept.name}${parsed.data.note ? " - " + parsed.data.note : ""}`,
    })
    .run();

  return NextResponse.json({ document: updated });
}
