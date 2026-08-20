import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import AcademicYearsClient from "@/components/admin/AcademicYearsClient";

export default async function AdminAcademicYearsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Quản lý năm học</h1>
      <p className="mb-5 text-sm text-slate-500">
        Thêm các năm học (VD: 2026-2027) để gắn vào từng văn bản, phục vụ lưu trữ và tra cứu
        theo năm học thay vì chỉ theo năm dương lịch.
      </p>
      <AcademicYearsClient />
    </AppShell>
  );
}
