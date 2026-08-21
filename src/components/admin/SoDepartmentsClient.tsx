"use client";

import { useEffect, useState } from "react";

type SoDepartment = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
};

export default function SoDepartmentsClient() {
  const [list, setList] = useState<SoDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/so-departments");
    const data = (await res.json()) as { soDepartments?: SoDepartment[] };
    setList(data.soDepartments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/so-departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setCode("");
      setName("");
      load();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(d: SoDepartment) {
    setError(null);
    const res = await fetch(`/api/admin/so-departments/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Không thể cập nhật.");
      return;
    }
    load();
  }

  async function handleDelete(d: SoDepartment) {
    setError(null);
    const res = await fetch(`/api/admin/so-departments/${d.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Không thể xoá phòng ban này.");
      return;
    }
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-5 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Thêm phòng ban của Sở</h2>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Mã phòng ban *</label>
            <input
              className="field-input"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: VP"
              maxLength={20}
            />
          </div>
          <div>
            <label className="field-label">Tên phòng ban/đơn vị *</label>
            <input
              className="field-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Văn phòng"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            Thêm phòng ban
          </button>
        </form>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên phòng ban/đơn vị</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Đang tải...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Chưa có phòng ban nào của Sở. Thêm phòng ban đầu tiên ở bên trái.
                </td>
              </tr>
            ) : (
              list.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{d.code}</td>
                  <td className="px-4 py-3 text-slate-600">{d.name}</td>
                  <td className="px-4 py-3">
                    <button
                      className={
                        d.isActive
                          ? "badge bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          : "badge bg-slate-100 text-slate-500 ring-slate-400/20"
                      }
                      onClick={() => handleToggleActive(d)}
                      title="Bấm để bật/tắt hoạt động"
                    >
                      {d.isActive ? "Đang dùng" : "Đã tắt"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm text-slate-500 hover:text-red-600 hover:underline"
                      onClick={() => handleDelete(d)}
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
