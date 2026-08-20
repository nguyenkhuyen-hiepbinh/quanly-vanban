"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/db/schema";

type UserRow = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: Role;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
};

type Dept = { id: number; name: string };

const ROLES: Role[] = ["ADMIN", "VANTHU", "TRUONGPHONG"];

export default function UsersClient({ currentUserId }: { currentUserId: number }) {
  const [list, setList] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "VANTHU" as Role,
    departmentId: "",
  });
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    role: "VANTHU" as Role,
    departmentId: "",
    isActive: true,
    newPassword: "",
  });

  async function load() {
    setLoading(true);
    const [uRes, dRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/departments"),
    ]);
    const uData = (await uRes.json()) as { users?: UserRow[] };
    const dData = (await dRes.json()) as { departments?: Dept[] };
    setList(uData.users ?? []);
    setDepartments(dData.departments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId ? Number(form.departmentId) : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setMessage(`Đã tạo tài khoản "${form.username}". Yêu cầu người dùng đổi mật khẩu ở lần đăng nhập đầu.`);
      setForm({ username: "", password: "", fullName: "", email: "", role: "VANTHU", departmentId: "" });
      load();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditForm({
      role: u.role,
      departmentId: u.departmentId ? String(u.departmentId) : "",
      isActive: u.isActive,
      newPassword: "",
    });
  }

  async function saveEdit(u: UserRow) {
    setError(null);
    const payload: Record<string, unknown> = {
      role: editForm.role,
      departmentId: editForm.departmentId ? Number(editForm.departmentId) : null,
      isActive: editForm.isActive,
    };
    if (editForm.newPassword) payload.password = editForm.newPassword;

    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Có lỗi xảy ra.");
      return;
    }
    setEditingId(null);
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-5 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Thêm tài khoản mới</h2>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {message}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="field-label">Họ và tên *</label>
            <input
              className="field-input"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Tên đăng nhập *</label>
            <input
              className="field-input"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Mật khẩu ban đầu *</label>
            <input
              type="text"
              className="field-input"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Vai trò *</label>
            <select
              className="field-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">
              Phòng ban {form.role === "TRUONGPHONG" ? "*" : ""}
            </label>
            <select
              className="field-input"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              required={form.role === "TRUONGPHONG"}
            >
              <option value="">-- Không thuộc phòng ban --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            Tạo tài khoản
          </button>
        </form>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Phòng ban</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Đang tải...
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{u.fullName}</p>
                    <p className="text-xs text-slate-400">@{u.username}</p>
                  </td>
                  {editingId === u.id ? (
                    <>
                      <td className="px-4 py-3">
                        <select
                          className="field-input"
                          value={editForm.role}
                          onChange={(e) =>
                            setEditForm({ ...editForm, role: e.target.value as Role })
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="field-input"
                          value={editForm.departmentId}
                          onChange={(e) =>
                            setEditForm({ ...editForm, departmentId: e.target.value })
                          }
                        >
                          <option value="">-- Không --</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field-input mt-2"
                          placeholder="Đặt lại mật khẩu (bỏ trống nếu giữ nguyên)"
                          value={editForm.newPassword}
                          onChange={(e) =>
                            setEditForm({ ...editForm, newPassword: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isActive: e.target.checked })
                            }
                            disabled={u.id === currentUserId}
                          />
                          Đang hoạt động
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="mr-3 text-sm text-blue-700 hover:underline"
                          onClick={() => saveEdit(u)}
                        >
                          Lưu
                        </button>
                        <button
                          className="text-sm text-slate-500 hover:underline"
                          onClick={() => setEditingId(null)}
                        >
                          Huỷ
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[u.role]}</td>
                      <td className="px-4 py-3 text-slate-500">{u.departmentName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700 ring-emerald-600/20"
                              : "bg-slate-200 text-slate-600 ring-slate-500/20"
                          }`}
                        >
                          {u.isActive ? "Hoạt động" : "Đã khoá"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-sm text-blue-700 hover:underline"
                          onClick={() => startEdit(u)}
                        >
                          Sửa
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
