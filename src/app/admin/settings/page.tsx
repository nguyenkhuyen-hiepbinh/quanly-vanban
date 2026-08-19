import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import SettingsClient from "@/components/admin/SettingsClient";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Cấu hình hệ thống</h1>
      <p className="mb-5 text-sm text-slate-500">
        Thiết lập chung áp dụng cho toàn hệ thống.
      </p>
      <SettingsClient />
    </AppShell>
  );
}
