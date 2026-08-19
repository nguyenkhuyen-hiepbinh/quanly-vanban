"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/Badges";
import { DOC_STATUS_LABELS } from "@/lib/labels";
import type { DocType, DocStatus } from "@/db/schema";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type DocRow = {
  id: number;
  type: DocType;
  soThuTu: number | null;
  soKyHieu: string | null;
  trichYeu: string;
  loaiVanBan: string;
  noiGui: string | null;
  noiNhan: string | null;
  hanXuLy: string | null;
  doKhan: "THUONG" | "KHAN" | "THUONG_KHAN" | "HOA_TOC";
  status: DocStatus;
  departmentName: string | null;
  createdAt: string;
};

type Department = { id: number; name: string };

export default function DocumentListClient({
  type,
  basePath,
  canCreate,
}: {
  type: DocType;
  basePath: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<DocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (departmentId) params.set("departmentId", departmentId);

    const res = await fetch(`/api/documents?${params.toString()}`);
    const data = (await res.json()) as { documents?: DocRow[]; total?: number };
    setRows(data.documents ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [type, page, q, status, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json() as Promise<{ departments?: Department[] }>)
      .then((d) => setDepartments(d.departments ?? []));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Tìm kiếm</label>
            <input
              className="field-input w-64"
              placeholder="Trích yếu, số hiệu, nơi gửi/nhận..."
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="field-label">Trạng thái</label>
            <select
              className="field-input w-44"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Tất cả</option>
              {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Phòng ban</label>
            <select
              className="field-input w-48"
              value={departmentId}
              onChange={(e) => {
                setPage(1);
                setDepartmentId(e.target.value);
              }}
            >
              <option value="">Tất cả</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {canCreate && (
          <Link href={`${basePath}/moi`} className="btn-primary">
            + Thêm văn bản
          </Link>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Số hiệu</th>
              <th className="px-4 py-3">Trích yếu</th>
              <th className="px-4 py-3">{type === "DEN" ? "Nơi gửi" : "Nơi nhận"}</th>
              <th className="px-4 py-3">Phòng ban</th>
              <th className="px-4 py-3">Hạn xử lý</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Không có văn bản nào phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`${basePath}/${d.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {type === "DEN" ? `Số ${d.soThuTu}` : d.soKyHieu || `Số ${d.soThuTu}`}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{d.trichYeu}</span>
                      <PriorityBadge doKhan={d.doKhan} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(type === "DEN" ? d.noiGui : d.noiNhan) || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.departmentName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="flex items-center gap-2">
                      {d.hanXuLy ? format(new Date(d.hanXuLy), "dd/MM/yyyy", { locale: vi }) : "—"}
                      <OverdueBadge hanXuLy={d.hanXuLy} status={d.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Trang {page}/{totalPages} · {total} văn bản
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <button
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
