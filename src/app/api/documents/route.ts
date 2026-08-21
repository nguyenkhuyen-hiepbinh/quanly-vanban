import { NextRequest, NextResponse } from "next/server";
import { and, or, eq, like, desc, sql as dsql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  documents,
  documentFiles,
  departments,
  soDepartments,
  academicYears,
  users,
  processingHistory,
  type DocType,
  type DocStatus,
} from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { documentCreateSchema } from "@/lib/validators";
import { getNextSequenceNumber, getNextHoSoNumber } from "@/lib/numbering";
import { saveUploadedFile } from "@/lib/storage";
import { stampPdf, isPdf } from "@/lib/stamp";
import { getOrgName } from "@/lib/settings";
import { todayVN, yearVN, formatDateVi } from "@/lib/date";

const creatorUsers = users;

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as DocType | null;
  const status = searchParams.get("status") as DocStatus | null;
  const departmentIdParam = searchParams.get("departmentId");
  const academicYearIdParam = searchParams.get("academicYearId");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20)
  );

  const conditions = [];
  if (type) conditions.push(eq(documents.type, type));
  if (status) conditions.push(eq(documents.status, status));
  if (departmentIdParam) {
    conditions.push(eq(documents.departmentId, Number(departmentIdParam)));
  }
  if (academicYearIdParam) {
    conditions.push(eq(documents.academicYearId, Number(academicYearIdParam)));
  }
  if (q) {
    const like_ = `%${q}%`;
    conditions.push(
      or(
        like(documents.trichYeu, like_),
        like(documents.soKyHieu, like_),
        like(documents.noiGui, like_),
        like(documents.noiNhan, like_)
      )
    );
  }

  // Trưởng phòng ban chỉ thấy văn bản của phòng mình
  if (session.role === "TRUONGPHONG") {
    if (!session.departmentId) {
      return NextResponse.json({ documents: [], total: 0, page, pageSize });
    }
    conditions.push(eq(documents.departmentId, session.departmentId));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const list = await db
    .select({
      id: documents.id,
      type: documents.type,
      soThuTu: documents.soThuTu,
      soKyHieu: documents.soKyHieu,
      namSo: documents.namSo,
      academicYearId: documents.academicYearId,
      academicYearName: academicYears.name,
      trichYeu: documents.trichYeu,
      loaiVanBan: documents.loaiVanBan,
      noiGui: documents.noiGui,
      noiNhan: documents.noiNhan,
      ngayVanBan: documents.ngayVanBan,
      ngayDen: documents.ngayDen,
      ngayDi: documents.ngayDi,
      hanXuLy: documents.hanXuLy,
      doKhan: documents.doKhan,
      doMat: documents.doMat,
      status: documents.status,
      isStamped: documents.isStamped,
      departmentId: documents.departmentId,
      departmentName: departments.name,
      createdAt: documents.createdAt,
      createdByName: creatorUsers.fullName,
    })
    .from(documents)
    .leftJoin(departments, eq(documents.departmentId, departments.id))
    .leftJoin(academicYears, eq(documents.academicYearId, academicYears.id))
    .leftJoin(creatorUsers, eq(documents.createdById, creatorUsers.id))
    .where(whereClause)
    .orderBy(desc(documents.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const totalRow = await db
    .select({ count: dsql<number>`count(*)` })
    .from(documents)
    .where(whereClause)
    .get();

  return NextResponse.json({
    documents: list,
    total: totalRow?.count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const type = formData.get("type") as DocType | null;

  const auth = await requireSession(
    type === "DEN" ? ["ADMIN", "VANTHU"] : ["ADMIN", "VANTHU", "TRUONGPHONG"]
  );
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const db = getDb();

  const raw: Record<string, unknown> = {};
  for (const key of [
    "type",
    "trichYeu",
    "loaiVanBan",
    "soKyHieu",
    "noiGui",
    "noiNhan",
    "ngayVanBan",
    "hanXuLy",
    "doKhan",
    "doMat",
    "departmentId",
    "soDepartmentId",
    "academicYearId",
    "soLuuHoSo",
    "ghiChu",
    "applyStamp",
  ]) {
    const v = formData.get(key);
    if (v !== null) raw[key] = v;
  }

  const parsed = documentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Trưởng phòng chỉ được tạo văn bản đi gắn với phòng ban của chính mình
  let departmentId = data.departmentId ?? null;
  if (session.role === "TRUONGPHONG") {
    departmentId = session.departmentId;
  }
  if (data.type === "DEN" && !departmentId) {
    return NextResponse.json(
      { error: "Vui lòng chọn phòng ban tiếp nhận xử lý văn bản đến." },
      { status: 400 }
    );
  }
  if (data.type === "DEN" && !data.soDepartmentId) {
    return NextResponse.json(
      { error: "Vui lòng chọn văn bản này thuộc Phòng ban nào của Sở." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn tệp văn bản để tải lên." }, { status: 400 });
  }
  const MAX_SIZE = 30 * 1024 * 1024; // 30MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Tệp tải lên không được vượt quá 30MB." }, { status: 400 });
  }
  const allowedMime = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedMime.includes(file.type)) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận tệp PDF, JPEG, PNG hoặc Word (.doc/.docx)." },
      { status: 400 }
    );
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());

  // Số đến/Số đi và Ngày đến phải tính theo ngày dương lịch giờ Việt Nam (không phải giờ UTC
  // của máy chủ Cloudflare) để đúng quy định tại Nghị định 30/2020/NĐ-CP - xem src/lib/date.ts.
  const year = data.ngayVanBan
    ? new Date(data.ngayVanBan).getFullYear() || yearVN()
    : yearVN();
  const soThuTu = await getNextSequenceNumber(data.type, year);

  const todayStr = todayVN();

  // deptRow: phòng ban NỘI BỘ TRƯỜNG được chuyển xử lý (hiển thị ở mục "Chuyển" trên dấu đến).
  const deptRow = departmentId
    ? await db.select().from(departments).where(eq(departments.id, departmentId)).get()
    : null;

  // soDeptRow: phòng ban CỦA SỞ mà văn bản đến này thuộc về - độc lập với deptRow ở trên, dùng
  // làm căn cứ tự sinh "Lưu hồ sơ số".
  const soDeptRow = data.soDepartmentId
    ? await db.select().from(soDepartments).where(eq(soDepartments.id, data.soDepartmentId)).get()
    : null;

  // Lưu hồ sơ số: với văn bản đến, tự sinh theo mã Phòng ban CỦA SỞ đã chọn + năm, dạng
  // "{Mã phòng ban của Sở}-{năm}-{số thứ tự 3 chữ số}" (VD: VP-2026-001), số thứ tự tự tăng
  // liên tiếp theo từng mã và reset về 001 mỗi năm mới - không cho nhập tay để tránh trùng/sai
  // định dạng.
  let soLuuHoSo: string | null = data.soLuuHoSo || null;
  if (data.type === "DEN" && soDeptRow?.code) {
    const hoSoSeq = await getNextHoSoNumber(soDeptRow.id, year);
    soLuuHoSo = `${soDeptRow.code}-${year}-${String(hoSoSeq).padStart(3, "0")}`;
  }

  // 1. Lưu file gốc lên R2
  const savedOriginal = await saveUploadedFile(originalBuffer, file.name, file.type);

  // 2. Đóng dấu công văn đến (chỉ áp dụng cho PDF - xem ghi chú trong src/lib/stamp.ts)
  let stampedStorageKey: string | null = null;
  let isStamped = false;
  const applyStamp = data.type === "DEN" && (data.applyStamp ?? true) && isPdf(file.type);

  if (applyStamp) {
    try {
      const stampData = {
        tenCoQuan: await getOrgName(),
        soDen: String(soThuTu),
        ngayDen: formatDateVi(todayStr),
        chuyen: deptRow?.name ?? "",
        soLuuHoSo: soLuuHoSo ?? "",
      };
      const stampedBuffer = await stampPdf(originalBuffer, stampData);
      const savedStamped = await saveUploadedFile(
        stampedBuffer,
        `dong-dau-${file.name}`,
        file.type
      );
      stampedStorageKey = savedStamped.storageKey;
      isStamped = true;
    } catch (err) {
      console.error("[Đóng dấu] Lỗi:", err);
      // Không chặn luồng lưu văn bản nếu đóng dấu thất bại - vẫn lưu bản gốc
    }
  }

  // 3. Ghi vào CSDL
  const created = await db
    .insert(documents)
    .values({
      type: data.type,
      soThuTu,
      namSo: year,
      academicYearId: data.academicYearId ?? null,
      soKyHieu: data.soKyHieu || null,
      trichYeu: data.trichYeu,
      loaiVanBan: data.loaiVanBan,
      noiGui: data.type === "DEN" ? data.noiGui || null : null,
      noiNhan: data.type === "DI" ? data.noiNhan || null : null,
      ngayVanBan: data.ngayVanBan || null,
      ngayDen: data.type === "DEN" ? todayStr : null,
      ngayDi: data.type === "DI" ? todayStr : null,
      hanXuLy: data.hanXuLy || null,
      doKhan: data.doKhan ?? "THUONG",
      doMat: data.doMat ?? "THUONG",
      soLuuHoSo,
      status: data.type === "DEN" ? "DA_CHUYEN" : "MOI",
      departmentId,
      soDepartmentId: data.type === "DEN" ? data.soDepartmentId ?? null : null,
      createdById: session.userId,
      ghiChu: data.ghiChu || null,
      isStamped,
    })
    .returning()
    .get();

  // 4. Lưu thông tin tệp
  await db
    .insert(documentFiles)
    .values({
      documentId: created.id,
      kind: "GOC",
      fileName: file.name,
      storageKey: savedOriginal.storageKey,
      mimeType: file.type,
      fileSize: file.size,
    })
    .run();

  if (stampedStorageKey) {
    await db
      .insert(documentFiles)
      .values({
        documentId: created.id,
        kind: "DA_DONG_DAU",
        fileName: `dong-dau-${file.name}`,
        storageKey: stampedStorageKey,
        mimeType: file.type,
        fileSize: originalBuffer.length,
      })
      .run();
  }

  // 5. Lịch sử xử lý
  const historyLines: string[] = [];
  historyLines.push(
    data.type === "DEN" ? "Tiếp nhận & số hoá văn bản đến" : "Tạo văn bản đi"
  );
  await db
    .insert(processingHistory)
    .values({
      documentId: created.id,
      userId: session.userId,
      action: historyLines[0],
      note: departmentId
        ? `Chuyển tới phòng ban ID ${departmentId}`
        : undefined,
    })
    .run();

  if (isStamped) {
    await db
      .insert(processingHistory)
      .values({
        documentId: created.id,
        userId: session.userId,
        action: "Đóng dấu công văn đến",
        note: `Số đến: ${soThuTu}`,
      })
      .run();
  }

  return NextResponse.json({ document: created }, { status: 201 });
}
