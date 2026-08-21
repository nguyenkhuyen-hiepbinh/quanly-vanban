import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ExtractedFields = {
  trichYeu: string;
  loaiVanBan: string;
  soKyHieu: string;
  noiGui: string;
  ngayVanBan: string; // YYYY-MM-DD (theo ngày ghi trong chính văn bản, không phải hôm nay)
};

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const EXTRACT_PROMPT = `Đây là ảnh chụp một văn bản hành chính tiếng Việt (công văn, quyết định, thông báo...). Hãy đọc kỹ và trả lời DUY NHẤT một đối tượng JSON hợp lệ (không kèm giải thích, không bọc trong dấu \`\`\`), đúng theo cấu trúc sau:
{
  "trichYeu": "trích yếu nội dung / tiêu đề văn bản, thường bắt đầu bằng 'V/v ...'",
  "loaiVanBan": "loại văn bản, VD: Công văn, Quyết định, Thông báo, Kế hoạch, Tờ trình, Báo cáo, Chỉ thị, Công điện",
  "soKyHieu": "số và ký hiệu văn bản, VD: 45/CV-SGDĐT",
  "noiGui": "tên cơ quan/đơn vị ban hành hoặc gửi văn bản",
  "ngayVanBan": "ngày ký/ban hành theo định dạng YYYY-MM-DD, lấy đúng theo ngày ghi trong văn bản"
}
Chỉ điền trường nào đọc RÕ RÀNG được trong ảnh. Nếu không chắc chắn hoặc không đọc được, để chuỗi rỗng "" cho trường đó - tuyệt đối không suy đoán hay bịa thông tin.`;

// Mô hình có thể trả lời kèm câu chữ thừa hoặc bọc trong ```json ... ``` dù đã dặn - lấy khối
// {...} đầu tiên tìm được rồi mới parse, thay vì parse thẳng toàn bộ chuỗi trả lời.
function extractJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Dùng Cloudflare Workers AI (model có khả năng đọc ảnh) để đọc và trích xuất thông tin từ
 * ảnh (JPEG/PNG) của một văn bản hành chính. CHỈ hỗ trợ ảnh - model này không nhận trực tiếp
 * file PDF (khác với API có vision của các nhà cung cấp khác), nên với PDF cần chụp/scan lại
 * thành ảnh nếu muốn dùng tính năng tự động điền.
 *
 * Ném lỗi (Error) với thông điệp tiếng Việt dễ hiểu nếu thất bại - nơi gọi hàm này cần
 * try/catch và không để lỗi này chặn luồng chính (đây chỉ là tính năng hỗ trợ điền nhanh,
 * không bắt buộc).
 */
export async function extractDocumentFields(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedFields> {
  if (mimeType !== "image/jpeg" && mimeType !== "image/png") {
    throw new Error(
      "Tự động điền chỉ hỗ trợ tệp ảnh JPEG hoặc PNG (chưa hỗ trợ PDF). Với văn bản dạng PDF, vui lòng nhập tay hoặc chụp ảnh trang đầu để dùng tính năng này."
    );
  }

  const { env } = getCloudflareContext();
  if (!env.AI) {
    throw new Error(
      "Chưa bật Workers AI cho ứng dụng (thiếu binding 'AI'). Kiểm tra lại mục \"ai\" trong wrangler.jsonc rồi triển khai lại."
    );
  }

  // Workers AI nhận ảnh dưới dạng mảng số (byte array) từ ArrayBuffer, không phải chuỗi base64.
  const imageBytes = [...new Uint8Array(fileBuffer)];

  let result: unknown;
  try {
    result = await env.AI.run(VISION_MODEL, {
      image: imageBytes,
      prompt: EXTRACT_PROMPT,
      max_tokens: 1024,
    });
  } catch (err) {
    throw new Error(
      `Gọi Cloudflare Workers AI thất bại: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const responseText =
    typeof result === "object" && result !== null && "response" in result
      ? String((result as { response?: unknown }).response ?? "")
      : String(result ?? "");

  const parsed = extractJsonObject(responseText);
  if (!parsed) {
    throw new Error("AI không trả về dữ liệu hợp lệ, vui lòng thử lại hoặc nhập tay.");
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    trichYeu: str(parsed.trichYeu),
    loaiVanBan: str(parsed.loaiVanBan),
    soKyHieu: str(parsed.soKyHieu),
    noiGui: str(parsed.noiGui),
    ngayVanBan: str(parsed.ngayVanBan),
  };
}
