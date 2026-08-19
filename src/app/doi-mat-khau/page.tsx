import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell session={session}>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Đổi mật khẩu</h1>
      <p className="mb-5 text-sm text-slate-500">Cập nhật mật khẩu đăng nhập của bạn.</p>
      <ChangePasswordForm />
    </AppShell>
  );
}
