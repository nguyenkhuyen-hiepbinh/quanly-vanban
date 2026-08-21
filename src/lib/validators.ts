import { z } from "zod";
import { ROLES, DOC_TYPES, DOC_STATUS, DO_KHAN, DO_MAT } from "@/db/schema";

export const departmentCreateSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã phòng ban").max(20),
  name: z.string().min(1, "Vui lòng nhập tên phòng ban").max(200),
  description: z.string().max(500).optional().nullable(),
});

export const departmentUpdateSchema = departmentCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const soDepartmentCreateSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã phòng ban").max(20),
  name: z.string().min(1, "Vui lòng nhập tên phòng ban").max(200),
});

export const academicYearCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Định dạng năm học phải là YYYY-YYYY, VD: 2026-2027"),
});

export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Tên đăng nhập chỉ gồm chữ, số, dấu . _ -"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  role: z.enum(ROLES),
  departmentId: z.number().int().positive().optional().nullable(),
});

export const userUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  role: z.enum(ROLES).optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(), // đặt lại mật khẩu
});

export const documentCreateSchema = z.object({
  type: z.enum(DOC_TYPES),
  trichYeu: z.string().min(1, "Vui lòng nhập trích yếu nội dung"),
  loaiVanBan: z.string().min(1),
  soKyHieu: z.string().optional().nullable(),
  noiGui: z.string().optional().nullable(),
  noiNhan: z.string().optional().nullable(),
  ngayVanBan: z.string().optional().nullable(),
  hanXuLy: z.string().optional().nullable(),
  doKhan: z.enum(DO_KHAN).optional(),
  doMat: z.enum(DO_MAT).optional(),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  soDepartmentId: z.coerce.number().int().positive().optional().nullable(),
  academicYearId: z.coerce.number().int().positive().optional().nullable(),
  soLuuHoSo: z.string().optional().nullable(),
  ghiChu: z.string().optional().nullable(),
  applyStamp: z.coerce.boolean().optional(),
});

export const documentUpdateSchema = z.object({
  trichYeu: z.string().min(1).optional(),
  loaiVanBan: z.string().min(1).optional(),
  soKyHieu: z.string().optional().nullable(),
  noiGui: z.string().optional().nullable(),
  noiNhan: z.string().optional().nullable(),
  ngayVanBan: z.string().optional().nullable(),
  hanXuLy: z.string().optional().nullable(),
  doKhan: z.enum(DO_KHAN).optional(),
  doMat: z.enum(DO_MAT).optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  academicYearId: z.number().int().positive().optional().nullable(),
  assignedToId: z.number().int().positive().optional().nullable(),
  status: z.enum(DOC_STATUS).optional(),
  ghiChu: z.string().optional().nullable(),
  soLuuHoSo: z.string().optional().nullable(),
});

export const transferSchema = z.object({
  departmentId: z.number().int().positive(),
  note: z.string().optional().nullable(),
});
