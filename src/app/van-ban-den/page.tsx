import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DocumentListClient from "@/components/DocumentListClient";

export default async function VanBanDenPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Văn bản đến</h1>
      <p className="mb-5 text-sm text-slate-500">
        Tiếp nhận, số hoá, đóng dấu và theo dõi xử lý văn bản đến.
      </p>
      <DocumentListClient
        type="DEN"
        basePath="/van-ban-den"
        canCreate={session.role === "ADMIN" || session.role === "VANTHU"}
      />
    </AppShell>
  );
}
