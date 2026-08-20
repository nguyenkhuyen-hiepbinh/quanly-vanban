import { eq, desc, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { todayVN } from "@/lib/date";
import {
  documents,
  departments,
  academicYears,
  documentFiles,
  processingHistory,
  users,
} from "@/db/schema";
import type { SessionPayload } from "@/lib/auth";
import { canAccessDepartment } from "@/lib/rbac";

export async function getDocumentDetail(id: number, session: SessionPayload) {
  const db = getDb();
  const doc = await db.select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return null;
  if (!canAccessDepartment(session, doc.departmentId)) return "forbidden" as const;

  const department = doc.departmentId
    ? await db.select().from(departments).where(eq(departments.id, doc.departmentId)).get()
    : null;
  const academicYear = doc.academicYearId
    ? await db.select().from(academicYears).where(eq(academicYears.id, doc.academicYearId)).get()
    : null;
  const creator = await db.select().from(users).where(eq(users.id, doc.createdById)).get();
  const assignee = doc.assignedToId
    ? await db.select().from(users).where(eq(users.id, doc.assignedToId)).get()
    : null;
  const files = await db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.documentId, id))
    .orderBy(asc(documentFiles.uploadedAt))
    .all();
  const history = await db
    .select({
      id: processingHistory.id,
      action: processingHistory.action,
      note: processingHistory.note,
      createdAt: processingHistory.createdAt,
      userName: users.fullName,
    })
    .from(processingHistory)
    .leftJoin(users, eq(processingHistory.userId, users.id))
    .where(eq(processingHistory.documentId, id))
    .orderBy(desc(processingHistory.createdAt))
    .all();

  return {
    document: doc,
    department,
    academicYear,
    creator: creator ? { id: creator.id, fullName: creator.fullName } : null,
    assignee: assignee ? { id: assignee.id, fullName: assignee.fullName } : null,
    files,
    history,
  };
}

export async function getDashboardStats(session: SessionPayload) {
  const db = getDb();
  let all = await db.select().from(documents).all();
  if (session.role === "TRUONGPHONG") {
    all = session.departmentId
      ? all.filter((d) => d.departmentId === session.departmentId)
      : [];
  }

  const today = todayVN();
  const isOverdue = (d: (typeof all)[number]) =>
    !!d.hanXuLy &&
    d.hanXuLy < today &&
    !["DA_XU_LY", "PHAT_HANH", "LUU_TRU"].includes(d.status);

  const den = all.filter((d) => d.type === "DEN");
  const di = all.filter((d) => d.type === "DI");

  const stats = {
    tongVanBanDen: den.length,
    tongVanBanDi: di.length,
    moiTiepNhan: den.filter((d) => d.status === "MOI" || d.status === "DA_CHUYEN").length,
    dangXuLy: all.filter((d) => d.status === "DANG_XU_LY").length,
    daXuLy: all.filter((d) => d.status === "DA_XU_LY" || d.status === "PHAT_HANH").length,
    quaHan: all.filter(isOverdue).length,
  };

  const depts = await db.select().from(departments).all();
  const byDepartment = depts
    .map((dept) => {
      const docsOfDept = all.filter((d) => d.departmentId === dept.id);
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        tongSo: docsOfDept.length,
        dangXuLy: docsOfDept.filter((d) => d.status === "DANG_XU_LY").length,
        quaHan: docsOfDept.filter(isOverdue).length,
      };
    })
    .filter((d) => d.tongSo > 0)
    .sort((a, b) => b.tongSo - a.tongSo);

  const allowedIds = new Set(all.map((d) => d.id));
  const recentRaw = await db
    .select({
      id: documents.id,
      type: documents.type,
      soThuTu: documents.soThuTu,
      trichYeu: documents.trichYeu,
      status: documents.status,
      createdAt: documents.createdAt,
      departmentName: departments.name,
    })
    .from(documents)
    .leftJoin(departments, eq(documents.departmentId, departments.id))
    .orderBy(desc(documents.createdAt))
    .limit(8)
    .all();
  const recent = recentRaw.filter((d) =>
    session.role === "TRUONGPHONG" ? allowedIds.has(d.id) : true
  );

  return { stats, byDepartment, recent };
}
