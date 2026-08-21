import { getCloudflareContext } from "@opennextjs/cloudflare";

export type ExtractedFields = {
  trichYeu: string;
  loaiVanBan: string;
  soKyHieu: string;
  noiGui: string;
  ngayVanBan: string; // YYYY-MM-DD (theo ngày ghi trong chính văn bản, không phải hôm nay)
};

// Đổi từ @cf/meta/llama-3.2-11b-vision-instruct sang model này vì Llama 3.2 Vision là model
// "gated" của Meta - lần gọi đầu tiên báo lỗi 5016 yêu cầu phải gửi 1 lần prompt "agree" để
// chấp nhận giấy phép (Meta Llama Community License), việc này cần gọi thẳng Cloudflare API
// bằng API token/curl - không làm được qua giao diện web thông thường. Moondream không phải
// model gated nên dùng được ngay, và được quảng cáo mạnh về khả năng OCR/structured output -
// phù hợp với việc đọc văn bản hành chính hơn.
const VISION_MODEL = "@cf/moondream/moondream3.1-9B-A2B";

const EXTRACT_PROMPT = `Đây là ảnh chụp một văn bản hành chính tiếng Việt (công văn, quyết định, thông báo...). Hãy đọc kỹ và trả lời DUY NHẤT một đối tượng JSON hợp lệ (không kèm giải thích, không bọc trong dấu \`\`\`), đúng theo cấu trúc sau:
{
  "trichYeu": "trích yếu nội dung / tiêu đề văn bản, thường bắt đầu bằng 'V/v ...'",
  "loaiVanBan": "loại văn bản, VD: Công văn, Quyết định, Thông báo, Kế hoạch, Tờ trình, Báo cáo, Chỉ thị, Công điện",
  "soKyHieu": "số và ký hiệu văn bản, VD: 45/CV-SGDĐT",
  "noiGui": "tên cơ quan/đơn vị ban hành hoặc gửi văn bản",
  "ngayVanBan": "ngày ký/ban hành theo định dạng YYYY-MM-DD, lấy đúng theo ngày ghi trong văn bản"
}
Chỉ điền trường nào đọc RÕ RÀNG được trong ảnh. Nếu không chắc chắn hoặc không đọc được, để chuỗi rỗng "" cho trường đó - tuyệt đối không suy đoán hay bịa thông tin.`;

// Model có thể trả lời kèm câu chữ thừa hoặc bọc trong ```json ... ``` dù đã dặn - lấy khối
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
 * file PDF, nên với PDF cần chụp/scan lại thành ảnh nếu muốn dùng tính năng tự động điền.
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

  // Model này nhận ảnh dạng base64 data URI (khác với @cf/meta/llama-3.2-11b-vision-instruct
  // trước đây nhận mảng byte thô).
  // Lưu ý: kiểu `Buffer` bị xung đột giữa @types/node và @cloudflare/workers-types trong dự án
  // này khiến TypeScript không thấy overload `toString(encoding)` (dù lúc chạy thực tế vẫn hoạt
  // động bình thường) - ép kiểu để gọi đúng API.
  const base64 = (fileBuffer as unknown as { toString(encoding: string): string }).toString(
    "base64"
  );
  const dataUri = `data:${mimeType};base64,${base64}`;

  let result: unknown;
  try {
    result = await env.AI.run(VISION_MODEL, {
      task: "query",
      image: dataUri,
      question: EXTRACT_PROMPT,
      // reasoning=true (mặc định) khiến model sinh thêm 1 đoạn "suy luận" trước khi trả lời
      // thật - có thể ăn hết max_tokens trước khi tới phần JSON cần lấy, khiến kết quả trả về
      // rỗng/thiếu dù gọi thành công. Tắt reasoning + tăng max_tokens để tránh việc này.
      reasoning: false,
      max_tokens: 2048,
    });
  } catch (err) {
    throw new Error(
      `Gọi Cloudflare Workers AI thất bại: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Phòng trường hợp tài liệu chính thức của Cloudflare mô tả sai/thiếu tên trường (đã từng
  // gặp) - thử lần lượt vài tên trường phổ biến trước khi coi cả kết quả trả về là văn bản.
  function pickText(r: unknown): string {
    if (typeof r === "string") return r;
    if (r && typeof r === "object") {
      const obj = r as Record<string, unknown>;
      for (const key of ["answer", "response", "result", "text"]) {
        if (typeof obj[key] === "string") return obj[key] as string;
      }
    }
    return JSON.stringify(r);
  }

  const responseText = pickText(result);

  const parsed = extractJsonObject(responseText);
  if (!parsed) {
    // Log lại nguyên văn câu trả lời của AI để tra cứu sau này (xem trong Cloudflare Dashboard
    // → Worker → Logs) nếu cần chẩn đoán thêm - không lộ ra cho người dùng vì quá kỹ thuật.
    console.error("[extract] AI trả lời không phải JSON hợp lệ:", responseText.slice(0, 500));
    throw new Error("AI không trả về dữ liệu hợp lệ, vui lòng thử lại hoặc nhập tay.");
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fields: ExtractedFields = {
    trichYeu: str(parsed.trichYeu),
    loaiVanBan: str(parsed.loaiVanBan),
    soKyHieu: str(parsed.soKyHieu),
    noiGui: str(parsed.noiGui),
    ngayVanBan: str(parsed.ngayVanBan),
  };

  const hasAnyValue = Object.values(fields).some((v) => v.length > 0);
  if (!hasAnyValue) {
    console.error("[extract] AI trả về JSON nhưng tất cả trường đều rỗng:", responseText.slice(0, 500));
    throw new Error(
      "AI không đọc được nội dung rõ trong ảnh này (ảnh có thể bị mờ, chụp nghiêng, chữ quá nhỏ, hoặc mô hình AI miễn phí đang dùng có giới hạn khi đọc tiếng Việt). Vui lòng thử lại với ảnh rõ nét hơn, chụp thẳng, đủ sáng - hoặc nhập tay."
    );
  }

  return fields;
}
