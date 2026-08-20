import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { academicYears } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { academicYearCreateSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.name))
    .all();
  return NextResponse.json({ academicYears: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const body = await req.json().catch(() => null);
  const parsed = academicYearCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.name, parsed.data.name))
    .get();
  if (existing) {
    return NextResponse.json({ error: "Năm học này đã tồn tại." }, { status: 409 });
  }

  const created = await db
    .insert(academicYears)
    .values({ name: parsed.data.name })
    .returning()
    .get();

  return NextResponse.json({ academicYear: created }, { status: 201 });
}
