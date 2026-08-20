import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { academicYears, documents } from "@/db/schema";
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
    .where(eq(documents.academicYearId, id))
    .get();
  if (inUse) {
    return NextResponse.json(
      { error: "Năm học đang được gắn cho ít nhất 1 văn bản nên không thể xoá." },
      { status: 409 }
    );
  }

  await db.delete(academicYears).where(eq(academicYears.id, id)).run();
  return NextResponse.json({ ok: true });
}
