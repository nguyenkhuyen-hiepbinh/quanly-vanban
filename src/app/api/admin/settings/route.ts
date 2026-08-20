import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { getOrgName, setOrgName } from "@/lib/settings";

export async function GET() {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ orgName: await getOrgName() });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSession(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { orgName?: string } | null;
  const orgName = typeof body?.orgName === "string" ? body.orgName.trim() : "";
  if (!orgName) {
    return NextResponse.json({ error: "Vui lòng nhập tên cơ quan/đơn vị." }, { status: 400 });
  }
  await setOrgName(orgName);
  return NextResponse.json({ orgName });
}
