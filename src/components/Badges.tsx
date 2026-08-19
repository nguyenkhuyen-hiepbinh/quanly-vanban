import {
  DOC_STATUS_LABELS,
  DOC_STATUS_COLORS,
  DO_KHAN_LABELS,
  DO_KHAN_COLORS,
} from "@/lib/labels";
import type { DocStatus, DoKhan } from "@/db/schema";

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={`badge ${DOC_STATUS_COLORS[status]}`}>
      {DOC_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ doKhan }: { doKhan: DoKhan }) {
  if (doKhan === "THUONG") return null;
  return (
    <span className={`badge ${DO_KHAN_COLORS[doKhan]}`}>
      {DO_KHAN_LABELS[doKhan]}
    </span>
  );
}

export function OverdueBadge({
  hanXuLy,
  status,
}: {
  hanXuLy: string | null;
  status: DocStatus;
}) {
  if (!hanXuLy) return null;
  const today = new Date().toISOString().slice(0, 10);
  const isDone = ["DA_XU_LY", "PHAT_HANH", "LUU_TRU"].includes(status);
  if (isDone || hanXuLy >= today) return null;
  return (
    <span className="badge bg-red-600 text-white ring-red-700">
      Quá hạn xử lý
    </span>
  );
}
