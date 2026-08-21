"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/db/schema";
import clsx from "clsx";

type NavItem = { href: string; label: string; icon: string };

const BASE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "📊" },
  { href: "/van-ban-den", label: "Văn bản đến", icon: "📥" },
  { href: "/van-ban-di", label: "Văn bản đi", icon: "📤" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/departments", label: "Phòng ban", icon: "🏢" },
  { href: "/admin/so-departments", label: "Phòng ban của Sở", icon: "🏛️" },
  { href: "/admin/academic-years", label: "Năm học", icon: "🗓️" },
  { href: "/admin/users", label: "Người dùng", icon: "👤" },
  { href: "/admin/settings", label: "Cấu hình hệ thống", icon: "⚙️" },
];

export default function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Nghiệp vụ
      </p>
      {BASE_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}

      {role === "ADMIN" && (
        <>
          <p className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quản trị hệ thống
          </p>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
