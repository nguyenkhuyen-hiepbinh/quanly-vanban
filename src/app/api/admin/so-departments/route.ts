import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { soDepartments } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { soDepartmentCreateSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const list = await db.select().from(soDepartments).orderBy(asc(soDepartments.code)).all();
  return NextResponse.json({ soDepartments: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  const db = getDb();

  const body = await req.json().catch(() => null);
  const parsed = soDepartmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const code = parsed.data.code.trim().toUpperCase();

  const existing = await db
    .select()
    .from(soDepartments)
    .where(eq(soDepartments.code, code))
    .get();
  if (existing) {
    return NextResponse.json({ error: "Mã phòng ban này đã tồn tại." }, { status: 409 });
  }

  const created = await db
    .insert(soDepartments)
    .values({ code, name: parsed.data.name.trim() })
    .returning()
    .get();

  return NextResponse.json({ soDepartment: created }, { status: 201 });
}
