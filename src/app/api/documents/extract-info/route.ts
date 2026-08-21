import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/rbac";
import { extractDocumentFields } from "@/lib/extract";

// Giới hạn riêng cho tính năng AI đọc ảnh/PDF (nhỏ hơn giới hạn tải lên chung 30MB) để tránh
// vượt quá thời gian xử lý / bộ nhớ cho phép của Cloudflare Worker.
const MAX_EXTRACT_SIZE = 15 * 1024 * 1024;

/**
 * Nhận 1 tệp (PDF/JPEG/PNG) rồi dùng Claude API (vision) để đọc và trả về các trường thông
 * tin gợi ý điền vào form thêm văn bản - chỉ là tính năng hỗ trợ, người dùng vẫn cần kiểm tra
 * lại trước khi lưu.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession(["ADMIN", "VANTHU", "TRUONGPHONG"]);
  if ("error" in auth) return auth.error;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Vui lòng chọn tệp trước." }, { status: 400 });
  }
  if (file.size > MAX_EXTRACT_SIZE) {
    return NextResponse.json(
      { error: "Tệp quá lớn để tự động đọc bằng AI (tối đa 15MB). Vui lòng nhập tay." },
      { status: 400 }
    );
  }

  const allowed = ["image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ tự động điền từ tệp ảnh JPEG hoặc PNG (chưa hỗ trợ PDF)." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fields = await extractDocumentFields(buffer, file.type);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[extract-info] Lỗi:", err);
    const message = err instanceof Error ? err.message : "Có lỗi xảy ra khi đọc tệp bằng AI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
