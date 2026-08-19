"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocType, Role } from "@/db/schema";
import { LOAI_VAN_BAN_OPTIONS, DO_KHAN_LABELS, DO_MAT_LABELS } from "@/lib/labels";

type Department = { id: number; name: string };

export default function DocumentFormClient({
  type,
  basePath,
  role,
  sessionDepartmentId,
}: {
  type: DocType;
  basePath: string;
  role: Role;
  sessionDepartmentId: number | null;
}) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    trichYeu: "",
    loaiVanBan: LOAI_VAN_BAN_OPTIONS[0],
    soKyHieu: "",
    noiGui: "",
    noiNhan: "",
    ngayVanBan: new Date().toISOString().slice(0, 10),
    hanXuLy: "",
    doKhan: "THUONG",
    doMat: "THUONG",
    departmentId: sessionDepartmentId ? String(sessionDepartmentId) : "",
    soLuuHoSo: "",
    ghiChu: "",
    applyStamp: true,
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json() as Promise<{ departments?: Department[] }>)
      .then((d) => setDepartments(d.departments ?? []));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Vui lòng chọn tệp văn bản để tải lên.");
      return;
    }
    if (type === "DEN" && !form.departmentId) {
      setError("Vui lòng chọn phòng ban tiếp nhận xử lý.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("trichYeu", form.trichYeu);
      fd.set("loaiVanBan", form.loaiVanBan);
      if (form.soKyHieu) fd.set("soKyHieu", form.soKyHieu);
      if (type === "DEN" && form.noiGui) fd.set("noiGui", form.noiGui);
      if (type === "DI" && form.noiNhan) fd.set("noiNhan", form.noiNhan);
      if (form.ngayVanBan) fd.set("ngayVanBan", form.ngayVanBan);
      if (form.hanXuLy) fd.set("hanXuLy", form.hanXuLy);
      fd.set("doKhan", form.doKhan);
      fd.set("doMat", form.doMat);
      if (form.departmentId) fd.set("departmentId", form.departmentId);
      if (form.soLuuHoSo) fd.set("soLuuHoSo", form.soLuuHoSo);
      if (form.ghiChu) fd.set("ghiChu", form.ghiChu);
      if (type === "DEN") fd.set("applyStamp", String(form.applyStamp));
      fd.set("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; document?: { id: number } };
      if (!res.ok || !data.document) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }
      router.push(`${basePath}/${data.document.id}`);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  const canPickDepartment = type === "DI" ? role !== "TRUONGPHONG" : true;

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="field-label">Trích yếu nội dung *</label>
        <textarea
          className="field-input"
          rows={2}
          required
          value={form.trichYeu}
          onChange={(e) => update("trichYeu", e.target.value)}
          placeholder="VD: V/v triển khai kế hoạch năm học 2026-2027"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Loại văn bản</label>
          <select
            className="field-input"
            value={form.loaiVanBan}
            onChange={(e) => update("loaiVanBan", e.target.value)}
          >
            {LOAI_VAN_BAN_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">
            {type === "DEN" ? "Số/ký hiệu văn bản (của đơn vị gửi)" : "Số/ký hiệu văn bản đi"}
          </label>
          <input
            className="field-input"
            value={form.soKyHieu}
            onChange={(e) => update("soKyHieu", e.target.value)}
            placeholder={type === "DEN" ? "VD: 45/CV-SGDĐT" : "Để trống nếu để hệ thống tự đánh số"}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {type === "DEN" ? (
          <div>
            <label className="field-label">Nơi gửi *</label>
            <input
              className="field-input"
              required
              value={form.noiGui}
              onChange={(e) => update("noiGui", e.target.value)}
              placeholder="VD: Sở Giáo dục và Đào tạo"
            />
          </div>
        ) : (
          <div>
            <label className="field-label">Nơi nhận *</label>
            <input
              className="field-input"
              required
              value={form.noiNhan}
              onChange={(e) => update("noiNhan", e.target.value)}
              placeholder="VD: Các tổ chuyên môn"
            />
          </div>
        )}
        <div>
          <label className="field-label">Ngày văn bản (ngày ký/ban hành)</label>
          <input
            type="date"
            className="field-input"
            value={form.ngayVanBan}
            onChange={(e) => update("ngayVanBan", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="field-label">Độ khẩn</label>
          <select
            className="field-input"
            value={form.doKhan}
            onChange={(e) => update("doKhan", e.target.value)}
          >
            {Object.entries(DO_KHAN_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Độ mật</label>
          <select
            className="field-input"
            value={form.doMat}
            onChange={(e) => update("doMat", e.target.value)}
          >
            {Object.entries(DO_MAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Hạn xử lý / trả lời</label>
          <input
            type="date"
            className="field-input"
            value={form.hanXuLy}
            onChange={(e) => update("hanXuLy", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">
            {type === "DEN" ? "Chuyển đến phòng ban xử lý *" : "Phòng ban soạn thảo"}
          </label>
          {canPickDepartment ? (
            <select
              className="field-input"
              value={form.departmentId}
              onChange={(e) => update("departmentId", e.target.value)}
              required={type === "DEN"}
            >
              <option value="">-- Chọn phòng ban --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field-input bg-slate-50"
              disabled
              value={departments.find((d) => d.id === sessionDepartmentId)?.name ?? "Phòng ban của bạn"}
            />
          )}
        </div>
        {type === "DEN" && (
          <div>
            <label className="field-label">Lưu hồ sơ số (nếu có)</label>
            <input
              className="field-input"
              value={form.soLuuHoSo}
              onChange={(e) => update("soLuuHoSo", e.target.value)}
              placeholder="VD: HS-01/2026"
            />
          </div>
        )}
      </div>

      <div>
        <label className="field-label">Ghi chú</label>
        <textarea
          className="field-input"
          rows={2}
          value={form.ghiChu}
          onChange={(e) => update("ghiChu", e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Tệp văn bản (PDF, JPG, PNG, Word) *</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="mt-1 text-xs text-slate-400">Kích thước tối đa 30MB.</p>
      </div>

      {type === "DEN" && (
        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.applyStamp}
              onChange={(e) => update("applyStamp", e.target.checked)}
            />
            Tự động đóng dấu &quot;CÔNG VĂN ĐẾN&quot; lên văn bản (theo mẫu Nghị định 30/2020/NĐ-CP)
          </label>
          <p className="pl-6 text-xs text-slate-400">
            Chỉ áp dụng cho tệp PDF. Với tệp ảnh (JPEG/PNG) hoặc Word, hệ thống sẽ lưu bản gốc
            và không đóng dấu tự động — có thể đóng dấu tay rồi tải lại nếu cần.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          Huỷ
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Đang lưu..." : "Lưu văn bản"}
        </button>
      </div>
    </form>
  );
}
