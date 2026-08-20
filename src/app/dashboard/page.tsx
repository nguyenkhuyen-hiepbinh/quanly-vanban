import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import { getDashboardStats } from "@/lib/queries";
import { StatusBadge } from "@/components/Badges";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { stats, byDepartment, recent } = await getDashboardStats(session);

  const tiles = [
    {
      label: "Văn bản đến",
      value: stats.tongVanBanDen,
      color: "bg-blue-50 text-blue-700",
      href: "/van-ban-den",
    },
    {
      label: "Văn bản đi",
      value: stats.tongVanBanDi,
      color: "bg-indigo-50 text-indigo-700",
      href: "/van-ban-di",
    },
    {
      label: "Đang xử lý",
      value: stats.dangXuLy,
      color: "bg-amber-50 text-amber-700",
      href: "/van-ban-den?status=DANG_XU_LY",
    },
    {
      label: "Quá hạn xử lý",
      value: stats.quaHan,
      color: "bg-red-50 text-red-700",
      href: "/van-ban-den?overdue=1",
    },
  ];

  const maxDept = Math.max(1, ...byDepartment.map((d) => d.tongSo));

  return (
    <AppShell session={session}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Tổng quan</h1>
          <p className="text-sm text-slate-500">
            Xin chào {session.fullName}, đây là tình hình văn bản hiện tại.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="card p-4 transition-shadow hover:shadow-md"
          >
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className={`mt-1 inline-block rounded px-1.5 text-2xl font-semibold ${t.color}`}>
              {t.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Văn bản gần đây
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có văn bản nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/${d.type === "DEN" ? "van-ban-den" : "van-ban-di"}/${d.id}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-blue-700"
                    >
                      {DOC_TYPE_LABELS[d.type]} #{d.soThuTu} — {d.trichYeu}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {d.departmentName ?? "Chưa phân phòng ban"} ·{" "}
                      {format(new Date(d.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-2 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Theo phòng ban
          </h2>
          {byDepartment.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-3">
              {byDepartment.map((d) => (
                <div key={d.departmentId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{d.departmentName}</span>
                    <span className="text-slate-500">{d.tongSo}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${(d.tongSo / maxDept) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
