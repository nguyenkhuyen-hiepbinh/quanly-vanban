import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import UsersClient from "@/components/admin/UsersClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Quản lý người dùng</h1>
      <p className="mb-5 text-sm text-slate-500">
        Tạo tài khoản và phân quyền cho văn thư, trưởng phòng ban các đơn vị.
      </p>
      <UsersClient currentUserId={session.userId} />
    </AppShell>
  );
}
