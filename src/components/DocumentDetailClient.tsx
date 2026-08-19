"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/Badges";
import {
  DOC_STATUS_LABELS,
  DOC_TYPE_LABELS,
  DO_MAT_LABELS,
} from "@/lib/labels";
import type { Role } from "@/db/schema";
import type { getDocumentDetail } from "@/lib/queries";

type DetailData = Exclude<
  Awaited<ReturnType<typeof getDocumentDetail>>,
  null | "forbidden"
>;

type Props = {
  basePath: string;
  role: Role;
  currentUserId: number;
  detail: DetailData;
};

const STATUS_OPTIONS = Object.entries(DOC_STATUS_LABELS);

export default function DocumentDetailClient({ basePath, role, detail }: Props) {
  const router = useRouter();
  const { document: doc, department, creator, assignee, files, history } = detail;

  const [status, setStatus] = useState(doc.status);
  const [ghiChu, setGhiChu] = useState(doc.ghiChu ?? "");
  const [assignedToId, setAssignedToId] = useState(assignee?.id ?? "");
  const [transferDeptId, setTransferDeptId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [deptUsers, setDeptUsers] = useState<{ id: number; fullName: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = role === "ADMIN" || role === "VANTHU" || role === "TRUONGPHONG";
  const canTransfer = role === "ADMIN" || role === "VANTHU";
  const canDelete = role === "ADMIN";

  useEffect(() => {
    const deptId = department?.id;
    const url = deptId ? `/api/users?departmentId=${deptId}` : "/api/users";
    fetch(url)
      .then((r) => r.json() as Promise<{ users?: { id: number; fullName: string }[] }>)
      .then((d) => setDeptUsers(d.users ?? []));
    if (canTransfer) {
      fetch("/api/departments")
        .then((r) => r.json() as Promise<{ departments?: { id: number; name: string }[] }>)
        .then((d) => setDepartments(d.departments ?? []));
    }
  }, [department?.id, canTransfer]);

  async function patchDocument(payload: Record<string, unknown>, successMsg: string, key: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setMessage(successMsg);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(null);
    }
  }

  async function handleTransfer() {
    if (!transferDeptId) return;
    setBusy("transfer");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: Number(transferDeptId), note: transferNote || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra.");
        return;
      }
      setMessage("Đã chuyển phòng ban xử lý.");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Bạn chắc chắn muốn xoá vĩnh viễn văn bản này? Hành động không thể hoàn tác.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Không thể xoá văn bản.");
        return;
      }
      router.push(basePath);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const soHieuDisplay =
    doc.type === "DEN"
      ? `Số đến: ${doc.soThuTu ?? "—"}`
      : doc.soKyHieu || `Số: ${doc.soThuTu ?? "—"}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="badge bg-slate-100 text-slate-600 ring-slate-400/20">
                {DOC_TYPE_LABELS[doc.type]}
              </span>
              <StatusBadge status={status} />
              <PriorityBadge doKhan={doc.doKhan} />
              <OverdueBadge hanXuLy={doc.hanXuLy} status={status} />
              {doc.isStamped && (
                <span className="badge bg-red-50 text-red-700 ring-red-600/20">
                  Đã đóng dấu đến
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-slate-500">{soHieuDisplay}</span>
          </div>

          <h1 className="mb-4 text-lg font-semibold text-slate-800">{doc.trichYeu}</h1>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Loại văn bản" value={doc.loaiVanBan} />
            <Info label="Số/ký hiệu văn bản gốc" value={doc.soKyHieu || "—"} />
            <Info label={doc.type === "DEN" ? "Nơi gửi" : "Nơi nhận"} value={(doc.type === "DEN" ? doc.noiGui : doc.noiNhan) || "—"} />
            <Info label="Phòng ban" value={department?.name || "—"} />
            <Info
              label="Ngày văn bản"
              value={doc.ngayVanBan ? format(new Date(doc.ngayVanBan), "dd/MM/yyyy", { locale: vi }) : "—"}
            />
            <Info
              label={doc.type === "DEN" ? "Ngày đến" : "Ngày phát hành"}
              value={
                (doc.type === "DEN" ? doc.ngayDen : doc.ngayDi)
                  ? format(new Date((doc.type === "DEN" ? doc.ngayDen : doc.ngayDi)!), "dd/MM/yyyy", { locale: vi })
                  : "—"
              }
            />
            <Info
              label="Hạn xử lý"
              value={doc.hanXuLy ? format(new Date(doc.hanXuLy), "dd/MM/yyyy", { locale: vi }) : "—"}
            />
            <Info label="Độ mật" value={DO_MAT_LABELS[doc.doMat]} />
            <Info label="Lưu hồ sơ số" value={doc.soLuuHoSo || "—"} />
            <Info label="Người tạo" value={creator?.fullName || "—"} />
            <Info label="Người phụ trách" value={assignee?.fullName || "Chưa phân công"} />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Tệp đính kèm</h2>
          {files.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có tệp nào.</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                >
                  <div>
                    <a
                      href={`/api/files/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {f.fileName}
                    </a>
                    <p className="text-xs text-slate-400">
                      {f.kind === "DA_DONG_DAU" ? "Bản đã đóng dấu công văn đến" : "Bản gốc"} ·{" "}
                      {(f.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <span className="badge bg-slate-100 text-slate-600 ring-slate-400/20">
                    {f.mimeType.split("/")[1]?.toUpperCase() || f.mimeType}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Lịch sử xử lý</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có lịch sử.</p>
          ) : (
            <ul className="space-y-3 border-l-2 border-slate-100 pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <p className="text-sm font-medium text-slate-700">{h.action}</p>
                  {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                  <p className="text-xs text-slate-400">
                    {h.userName || "Hệ thống"} ·{" "}
                    {format(new Date(h.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {(error || message) && (
          <div
            className={`rounded-md px-3 py-2 text-sm ring-1 ring-inset ${
              error
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {error || message}
          </div>
        )}

        {canManage && (
          <div className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700">Xử lý văn bản</h2>

            <div>
              <label className="field-label">Trạng thái</label>
              <div className="flex gap-2">
                <select
                  className="field-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                >
                  {STATUS_OPTIONS.map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary shrink-0"
                  disabled={busy === "status"}
                  onClick={() => patchDocument({ status }, "Đã cập nhật trạng thái.", "status")}
                >
                  Lưu
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Người phụ trách</label>
              <div className="flex gap-2">
                <select
                  className="field-input"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">-- Chưa phân công --</option>
                  {deptUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary shrink-0"
                  disabled={busy === "assign" || !assignedToId}
                  onClick={() =>
                    patchDocument(
                      { assignedToId: Number(assignedToId) },
                      "Đã phân công xử lý.",
                      "assign"
                    )
                  }
                >
                  Giao
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Ghi chú xử lý</label>
              <textarea
                className="field-input"
                rows={2}
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
              />
              <button
                className="btn-secondary mt-2 w-full"
                disabled={busy === "note"}
                onClick={() => patchDocument({ ghiChu }, "Đã lưu ghi chú.", "note")}
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        )}

        {canTransfer && (
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-700">Chuyển phòng ban xử lý</h2>
            <select
              className="field-input"
              value={transferDeptId}
              onChange={(e) => setTransferDeptId(e.target.value)}
            >
              <option value="">-- Chọn phòng ban --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              className="field-input"
              placeholder="Ghi chú khi chuyển (tuỳ chọn)"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
            <button
              className="btn-primary w-full"
              disabled={busy === "transfer" || !transferDeptId}
              onClick={handleTransfer}
            >
              Chuyển phòng ban
            </button>
          </div>
        )}

        {canDelete && (
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Khu vực nguy hiểm</h2>
            <button className="btn-danger w-full" disabled={busy === "delete"} onClick={handleDelete}>
              Xoá văn bản
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}
