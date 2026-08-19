import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DocumentFormClient from "@/components/DocumentFormClient";

export default async function NewVanBanDiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">
        Tạo văn bản đi
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        Soạn thảo và đăng ký văn bản đi, hệ thống sẽ tự sinh số thứ tự trong năm.
      </p>
      <DocumentFormClient
        type="DI"
        basePath="/van-ban-di"
        role={session.role}
        sessionDepartmentId={session.departmentId}
      />
    </AppShell>
  );
}
