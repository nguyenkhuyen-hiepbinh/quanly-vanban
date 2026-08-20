import type { Role, DocType, DocStatus, DoKhan, DoMat } from "@/db/schema";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  VANTHU: "Văn thư",
  TRUONGPHONG: "Trưởng phòng ban",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  DEN: "Văn bản đến",
  DI: "Văn bản đi",
};

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  MOI: "Mới tiếp nhận",
  DA_CHUYEN: "Đã chuyển phòng ban",
  DANG_XU_LY: "Đang xử lý",
  DA_XU_LY: "Đã xử lý xong",
  PHAT_HANH: "Đã phát hành",
  LUU_TRU: "Lưu trữ",
};

export const DOC_STATUS_COLORS: Record<DocStatus, string> = {
  MOI: "bg-blue-100 text-blue-700 ring-blue-600/20",
  DA_CHUYEN: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
  DANG_XU_LY: "bg-amber-100 text-amber-700 ring-amber-600/20",
  DA_XU_LY: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  PHAT_HANH: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  LUU_TRU: "bg-slate-200 text-slate-700 ring-slate-500/20",
};

export const DO_KHAN_LABELS: Record<DoKhan, string> = {
  THUONG: "Thường",
  KHAN: "Khẩn",
  THUONG_KHAN: "Thượng khẩn",
  HOA_TOC: "Hoả tốc",
};

export const DO_KHAN_COLORS: Record<DoKhan, string> = {
  THUONG: "bg-slate-100 text-slate-700 ring-slate-500/20",
  KHAN: "bg-orange-100 text-orange-700 ring-orange-600/20",
  THUONG_KHAN: "bg-red-100 text-red-700 ring-red-600/20",
  HOA_TOC: "bg-red-200 text-red-800 ring-red-700/30",
};

export const DO_MAT_LABELS: Record<DoMat, string> = {
  THUONG: "Thường",
  MAT: "Mật",
  TOI_MAT: "Tối mật",
  TUYET_MAT: "Tuyệt mật",
};

export const LOAI_VAN_BAN_OPTIONS = [
  "Công văn",
  "Quyết định",
  "Thông báo",
  "Kế hoạch",
  "Báo cáo",
  "Tờ trình",
  "Chỉ thị",
  "Quy chế",
  "Biên bản",
  "Giấy mời",
  "Công điện",
  "Khác",
];
