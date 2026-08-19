import Link from "next/link";
import type { SessionPayload } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import SidebarNav from "./SidebarNav";
import LogoutButton from "./LogoutButton";

export default function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-700 text-lg font-bold text-white">
              VB
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-800">
                Quản lý Văn bản
              </p>
              <p className="text-xs text-slate-400">Đến - Đi</p>
            </div>
          </div>
          <SidebarNav role={session.role} />
          <div className="border-t border-slate-200 p-3">
            <p className="truncate text-sm font-medium text-slate-800">
              {session.fullName}
            </p>
            <p className="mb-2 truncate text-xs text-slate-400">
              {ROLE_LABELS[session.role]}
            </p>
            <div className="flex items-center justify-between">
              <Link href="/doi-mat-khau" className="text-sm text-slate-500 hover:text-blue-700">
                Đổi mật khẩu
              </Link>
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="ml-60 flex-1">
          <main className="mx-auto max-w-6xl px-6 py-8">
            {session.mustChangePassword && (
              <div className="mb-5 flex items-center justify-between rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
                <span>
                  Tài khoản của bạn đang dùng mật khẩu tạm thời. Vui lòng đổi mật khẩu để đảm bảo an toàn.
                </span>
                <Link href="/doi-mat-khau" className="font-medium underline">
                  Đổi ngay
                </Link>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
