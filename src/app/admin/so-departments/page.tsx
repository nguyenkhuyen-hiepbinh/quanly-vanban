import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import SoDepartmentsClient from "@/components/admin/SoDepartmentsClient";

export default async function AdminSoDepartmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Phòng ban của Sở</h1>
      <p className="mb-5 text-sm text-slate-500">
        Danh mục Phòng ban/Đơn vị thuộc Sở Giáo dục và Đào tạo (cơ quan ban hành văn bản đến) -
        khác với danh mục &quot;Phòng ban&quot; nội bộ của trường. Khi tiếp nhận văn bản đến,
        người dùng chọn văn bản thuộc phòng ban nào của Sở trong danh mục này để hệ thống tự
        sinh &quot;Lưu hồ sơ số&quot; theo mã tương ứng (VD: VP-2026-001).
      </p>
      <SoDepartmentsClient />
    </AppShell>
  );
}
