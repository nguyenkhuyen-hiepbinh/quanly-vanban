import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DocumentListClient from "@/components/DocumentListClient";

export default async function VanBanDiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Văn bản đi</h1>
      <p className="mb-5 text-sm text-slate-500">
        Soạn thảo, đánh số và phát hành văn bản đi.
      </p>
      <DocumentListClient
        type="DI"
        basePath="/van-ban-di"
        canCreate={
          session.role === "ADMIN" ||
          session.role === "VANTHU" ||
          session.role === "TRUONGPHONG"
        }
      />
    </AppShell>
  );
}
