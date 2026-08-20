import { NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { getDashboardStats } from "@/lib/queries";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getDashboardStats(auth.session));
}
