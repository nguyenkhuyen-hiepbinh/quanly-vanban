"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: number; name: string; createdAt: string };

export default function AcademicYearsClient() {
  const [list, setList] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/academic-years");
    const data = (await res.json()) as { academicYears?: AcademicYear[] };
    setList(data.academicYears ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function suggestNext() {
    if (list.length === 0) {
      const y = new Date().getFullYear();
      return `${y}-${y + 1}`;
    }
    const latest = list[0].name; // đã sắp xếp giảm dần theo tên
    const startYear = Number(latest.split("-")[0]);
    if (Number.isFinite(startYear)) {
      return `${startYear + 1}-${startYear + 2}`;
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setName("");
      load();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(y: AcademicYear) {
    setError(null);
    const res = await fetch(`/api/admin/academic-years/${y.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Không thể xoá năm học này.");
      return;
    }
    load();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-5 lg:col-span-1">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Thêm năm học mới</h2>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Năm học *</label>
            <input
              className="field-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`VD: ${suggestNext() || "2026-2027"}`}
              pattern="\d{4}-\d{4}"
              title="Định dạng: YYYY-YYYY, VD: 2026-2027"
            />
            <p className="mt-1 text-xs text-slate-400">Định dạng YYYY-YYYY, ví dụ: 2026-2027.</p>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            Thêm năm học
          </button>
        </form>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Năm học</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                  Đang tải...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                  Chưa có năm học nào. Thêm năm học đầu tiên ở bên trái.
                </td>
              </tr>
            ) : (
              list.map((y) => (
                <tr key={y.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{y.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm text-slate-500 hover:text-red-600 hover:underline"
                      onClick={() => handleDelete(y)}
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
