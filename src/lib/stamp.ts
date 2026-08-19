import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type StampData = {
  tenCoQuan: string; // Tên cơ quan/đơn vị tiếp nhận (VD: TRƯỜNG THPT ABC)
  soDen: string; // Số đến (đã format, VD: "125")
  ngayDen: string; // Ngày đến, format dd/mm/yyyy
  chuyen: string; // Chuyển đến phòng ban/cá nhân nào xử lý
  soLuuHoSo?: string; // Lưu hồ sơ số (có thể để trống, điền tay sau)
};

// Font đóng dấu được đặt trong public/fonts/ để Worker có thể nạp qua binding ASSETS lúc
// runtime (Cloudflare Workers không có filesystem truyền thống nên không dùng fs.readFile
// như bản chạy Node.js trước đây).
const FONT_PATHS = {
  regular: "/fonts/DejaVuSans.ttf",
  bold: "/fonts/DejaVuSans-Bold.ttf",
};

let regularFontBytesCache: Uint8Array | null = null;
let boldFontBytesCache: Uint8Array | null = null;

async function fetchAssetBytes(pathname: string): Promise<Uint8Array> {
  const { env } = getCloudflareContext();
  if (!env.ASSETS) {
    throw new Error(
      "Thiếu binding 'ASSETS' (static assets của Cloudflare Workers) nên không nạp được font đóng dấu."
    );
  }
  const res = await env.ASSETS.fetch(new URL(pathname, "https://assets.local"));
  if (!res.ok) {
    throw new Error(`Không tải được font "${pathname}" (HTTP ${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function loadFontBytes() {
  if (!regularFontBytesCache) {
    regularFontBytesCache = await fetchAssetBytes(FONT_PATHS.regular);
  }
  if (!boldFontBytesCache) {
    boldFontBytesCache = await fetchAssetBytes(FONT_PATHS.bold);
  }
  return { regular: regularFontBytesCache, bold: boldFontBytesCache };
}

/**
 * Đóng dấu "CÔNG VĂN ĐẾN" (theo mẫu tại Nghị định 30/2020/NĐ-CP, Điều 20)
 * lên trang đầu tiên của file PDF. Trả về buffer PDF mới, không sửa file gốc.
 *
 * Lưu ý: kể từ khi chuyển sang chạy trên Cloudflare Workers, tính năng đóng dấu chỉ áp dụng
 * cho file PDF. Đóng dấu trực tiếp lên ảnh (JPEG/PNG, dùng thư viện `sharp`) đã được gỡ bỏ vì
 * `sharp` cần native addon không chạy được trên Workers - xem HUONG-DAN-CLOUDFLARE.md.
 */
export async function stampPdf(
  inputBuffer: Buffer | Uint8Array,
  data: StampData
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(inputBuffer, {
    ignoreEncryption: true,
  });
  pdfDoc.registerFontkit(fontkit);

  const { regular, bold } = await loadFontBytes();
  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  const page = pdfDoc.getPages()[0];
  if (!page) throw new Error("Tệp PDF không có trang nào để đóng dấu.");

  const { width, height } = page.getSize();

  // Kích thước khung dấu (điểm PDF, 72pt = 1 inch ≈ 25.4mm)
  const boxW = 200;
  const boxH = 108;
  const margin = 24;
  const x = width - boxW - margin;
  const y = height - boxH - margin;

  const red = rgb(0.75, 0.05, 0.05);
  const white = rgb(1, 1, 1);

  // Nền trắng mờ phía sau để chữ dễ đọc dù đè lên nội dung văn bản
  page.drawRectangle({
    x,
    y,
    width: boxW,
    height: boxH,
    color: white,
    opacity: 0.85,
    borderColor: red,
    borderWidth: 1.5,
  });

  let cursorY = y + boxH - 16;
  const lineGap = 15.5;
  const padX = x + 10;

  const tenCoQuanDisplay = data.tenCoQuan.toUpperCase();
  page.drawText(tenCoQuanDisplay, {
    x: padX,
    y: cursorY,
    size: 7.5,
    font: fontBold,
    color: red,
    maxWidth: boxW - 20,
  });
  cursorY -= 12;

  page.drawText("CÔNG VĂN ĐẾN", {
    x: padX,
    y: cursorY,
    size: 11,
    font: fontBold,
    color: red,
  });
  cursorY -= lineGap + 2;

  const rows: [string, string][] = [
    ["Số đến:", data.soDen],
    ["Ngày đến:", data.ngayDen],
    ["Chuyển:", data.chuyen || "................................"],
    ["Lưu hồ sơ số:", data.soLuuHoSo || "........................"],
  ];

  for (const [label, value] of rows) {
    page.drawText(label, {
      x: padX,
      y: cursorY,
      size: 8.5,
      font: fontBold,
      color: red,
    });
    page.drawText(value, {
      x: padX + 68,
      y: cursorY,
      size: 8.5,
      font,
      color: red,
      maxWidth: boxW - 68 - 14,
    });
    cursorY -= lineGap;
  }

  const outBytes = await pdfDoc.save();
  return Buffer.from(outBytes);
}

export function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
