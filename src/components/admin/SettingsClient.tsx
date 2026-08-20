"use client";

import { useEffect, useState } from "react";

export default function SettingsClient() {
  const [orgName, setOrgNameState] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json() as Promise<{ orgName?: string }>)
      .then((d) => {
        setOrgNameState(d.orgName ?? "");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setMessage("Đã lưu cấu hình. Tên cơ quan mới sẽ áp dụng cho các dấu công văn đến tiếp theo.");
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Đang tải...</p>;

  return (
    <form onSubmit={handleSave} className="card max-w-lg space-y-4 p-6">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {message}
        </div>
      )}
      <div>
        <label className="field-label">Tên cơ quan / đơn vị</label>
        <input
          className="field-input"
          value={orgName}
          onChange={(e) => setOrgNameState(e.target.value)}
          placeholder="VD: TRƯỜNG THPT NGUYỄN HUỆ"
        />
        <p className="mt-1 text-xs text-slate-400">
          Tên này sẽ hiển thị trên dấu &quot;CÔNG VĂN ĐẾN&quot; đóng vào văn bản khi tiếp nhận.
        </p>
      </div>
      <button type="submit" disabled={busy} className="btn-primary">
        Lưu cấu hình
      </button>
    </form>
  );
}
