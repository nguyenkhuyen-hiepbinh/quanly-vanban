import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---------- ENUM-LIKE CONSTANTS (SQLite has no native enum) ----------
export const ROLES = ["ADMIN", "VANTHU", "TRUONGPHONG"] as const;
export type Role = (typeof ROLES)[number];

export const DOC_TYPES = ["DEN", "DI"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_STATUS = [
  "MOI",          // mới tiếp nhận / mới tạo
  "DA_CHUYEN",    // đã chuyển phòng ban xử lý
  "DANG_XU_LY",   // đang xử lý
  "DA_XU_LY",     // đã xử lý xong
  "PHAT_HANH",    // (văn bản đi) đã phát hành
  "LUU_TRU",      // lưu trữ / đóng hồ sơ
] as const;
export type DocStatus = (typeof DOC_STATUS)[number];

export const DO_KHAN = ["THUONG", "KHAN", "THUONG_KHAN", "HOA_TOC"] as const;
export type DoKhan = (typeof DO_KHAN)[number];

export const DO_MAT = ["THUONG", "MAT", "TOI_MAT", "TUYET_MAT"] as const;
export type DoMat = (typeof DO_MAT)[number];

// ---------- TABLES ----------

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role", { enum: ROLES }).notNull().default("VANTHU"),
  departmentId: integer("department_id").references(() => departments.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  mustChangePassword: integer("must_change_password", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Bộ đếm số văn bản đến / đi theo từng năm để tự sinh "Số đến" / "Số đi"
// Có unique index (type, year) để dùng INSERT ... ON CONFLICT DO UPDATE (upsert nguyên tử,
// tránh trùng số khi nhiều người thao tác đồng thời) - bắt buộc trên Cloudflare D1 vì D1
// không hỗ trợ transaction tương tác kiểu better-sqlite3.
export const counters = sqliteTable(
  "counters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    year: integer("year").notNull(),
    type: text("type", { enum: DOC_TYPES }).notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (table) => ({
    typeYearUnique: uniqueIndex("counters_type_year_unique").on(
      table.type,
      table.year
    ),
  })
);

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: DOC_TYPES }).notNull(),

  // Số hiệu
  soThuTu: integer("so_thu_tu"), // số đến / số đi (số nguyên tuần tự trong năm)
  soKyHieu: text("so_ky_hieu"), // số/ký hiệu văn bản gốc (VD: 15/QĐ-THPT)
  namSo: integer("nam_so"), // năm áp dụng số thứ tự

  trichYeu: text("trich_yeu").notNull(), // trích yếu nội dung
  loaiVanBan: text("loai_van_ban").notNull().default("Công văn"), // Công văn/Quyết định/Thông báo/Kế hoạch...

  // Đối tác
  noiGui: text("noi_gui"), // nơi gửi (văn bản đến)
  noiNhan: text("noi_nhan"), // nơi nhận (văn bản đi)

  // Ngày tháng
  ngayVanBan: text("ngay_van_ban"), // ngày ký/ban hành trên văn bản gốc
  ngayDen: text("ngay_den"), // ngày đến (văn bản đến)
  ngayDi: text("ngay_di"), // ngày phát hành (văn bản đi)
  hanXuLy: text("han_xu_ly"), // hạn xử lý / hạn trả lời

  doKhan: text("do_khan", { enum: DO_KHAN }).notNull().default("THUONG"),
  doMat: text("do_mat", { enum: DO_MAT }).notNull().default("THUONG"),

  soLuuHoSo: text("so_luu_ho_so"), // lưu hồ sơ số (trên dấu đến)

  status: text("status", { enum: DOC_STATUS }).notNull().default("MOI"),

  departmentId: integer("department_id").references(() => departments.id), // phòng ban xử lý / soạn thảo
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),

  ghiChu: text("ghi_chu"), // ghi chú xử lý

  isStamped: integer("is_stamped", { mode: "boolean" }).notNull().default(false),

  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const documentFiles = sqliteTable("document_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["GOC", "DA_DONG_DAU"] }).notNull().default("GOC"), // bản gốc / bản đã đóng dấu
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(), // object key trong Cloudflare R2
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedAt: text("uploaded_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Cấu hình chung của hệ thống (key-value), VD: tên cơ quan hiển thị trên dấu công văn đến
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const processingHistory = sqliteTable("processing_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // VD: "Tiếp nhận & đóng dấu", "Chuyển phòng ban", "Cập nhật trạng thái"
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
