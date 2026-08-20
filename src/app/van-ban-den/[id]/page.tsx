import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import DocumentDetailClient from "@/components/DocumentDetailClient";
import { getDocumentDetail } from "@/lib/queries";

export default async function VanBanDenDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) redirect("/login");

  const detail = await getDocumentDetail(Number(params.id), session);
  if (detail === null) notFound();
  if (detail === "forbidden") {
    return (
      <AppShell session={session}>
        <p className="text-sm text-red-600">Bạn không có quyền xem văn bản này.</p>
      </AppShell>
    );
  }

  return (
    <AppShell session={session}>
      <div className="mb-4">
        <Link href="/van-ban-den" className="text-sm text-slate-500 hover:text-blue-700">
          ← Quay lại danh sách văn bản đến
        </Link>
      </div>
      <DocumentDetailClient
        basePath="/van-ban-den"
        role={session.role}
        currentUserId={session.userId}
        detail={detail}
      />
    </AppShell>
  );
}
