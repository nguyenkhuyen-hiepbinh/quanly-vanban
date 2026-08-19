"use client";

import { useEffect, useState } from "react";

type Dept = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export default function DepartmentsClient() {
  const [list, setList] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [editing, setEditing] = useState<Dept | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/departments");
    const data = (await res.json()) as { departments?: Dept[] };
    setList(data.departments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(d: Dept) {
    setEditing(d);
    setForm({ code: d.code, name: d.name, description: d.description ?? "" });
  }

  function resetForm() {
    setEditing(null);
    setForm({ code: "", name: "", description: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        editing ? `/api/admin/departments/${editing.id}` : "/api/admin/departments",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      resetForm();
      load();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(d: Dept) {
    await fetch(`/api/admin/departments/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-5 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          {editing ? `Sửa phòng ban: ${editing.name}` : "Thêm phòng ban mới"}
        </h2>
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
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="VD: DT, KT, VP..."
            />
          </div>
          <div>
            <label className="field-label">Tên phòng ban *</label>
            <input
              className="field-input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Phòng Đào tạo"
            />
          </div>
          <div>
            <label className="field-label">Mô tả</label>
            <textarea
              className="field-input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {editing ? "Lưu thay đổi" : "Thêm phòng ban"}
            </button>
            {editing && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Huỷ
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên phòng ban</th>
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
                  Chưa có phòng ban nào.
                </td>
              </tr>
            ) : (
              list.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{d.code}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.name}
                    {d.description && (
                      <p className="text-xs text-slate-400">{d.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        d.isActive
                          ? "bg-emerald-100 text-emerald-700 ring-emerald-600/20"
                          : "bg-slate-200 text-slate-600 ring-slate-500/20"
                      }`}
                    >
                      {d.isActive ? "Hoạt động" : "Đã vô hiệu hoá"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="mr-3 text-sm text-blue-700 hover:underline"
                      onClick={() => startEdit(d)}
                    >
                      Sửa
                    </button>
                    <button
                      className="text-sm text-slate-500 hover:text-red-600 hover:underline"
                      onClick={() => toggleActive(d)}
                    >
                      {d.isActive ? "Vô hiệu hoá" : "Kích hoạt lại"}
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
