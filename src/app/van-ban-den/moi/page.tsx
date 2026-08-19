import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DocumentFormClient from "@/components/DocumentFormClient";

export default async function NewVanBanDenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "VANTHU") {
    redirect("/van-ban-den");
  }

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">
        Tiếp nhận văn bản đến
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        Số hoá văn bản, hệ thống sẽ tự sinh số đến và đóng dấu công văn đến.
      </p>
      <DocumentFormClient
        type="DEN"
        basePath="/van-ban-den"
        role={session.role}
        sessionDepartmentId={session.departmentId}
      />
    </AppShell>
  );
}
