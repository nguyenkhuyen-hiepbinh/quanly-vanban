import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DepartmentsClient from "@/components/admin/DepartmentsClient";

export default async function AdminDepartmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Quản lý phòng ban</h1>
      <p className="mb-5 text-sm text-slate-500">
        Tạo và quản lý các phòng ban để phân quyền tiếp nhận, xử lý văn bản.
      </p>
      <DepartmentsClient />
    </AppShell>
  );
}
