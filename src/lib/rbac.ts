import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "./auth";
import type { Role } from "@/db/schema";

/**
 * Dùng trong các Route Handler (app/api/**) để bắt buộc đăng nhập,
 * và (tuỳ chọn) giới hạn theo vai trò cụ thể.
 * Trả về { session } nếu hợp lệ, hoặc { error: NextResponse } nếu không.
 */
export async function requireSession(
  allowedRoles?: Role[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Chưa đăng nhập hoặc phiên đã hết hạn." },
        { status: 401 }
      ),
    };
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/** Trưởng phòng chỉ được thao tác trên văn bản của phòng ban mình. Admin/Văn thư xem được tất cả. */
export function canAccessDepartment(
  session: SessionPayload,
  departmentId: number | null
): boolean {
  if (session.role === "ADMIN" || session.role === "VANTHU") return true;
  if (session.role === "TRUONGPHONG") {
    return session.departmentId !== null && session.departmentId === departmentId;
  }
  return false;
}
