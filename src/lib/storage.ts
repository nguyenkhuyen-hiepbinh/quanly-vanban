import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function extname(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return "";
  return fileName.slice(idx);
}

function getBucket(): R2Bucket {
  const { env } = getCloudflareContext();
  if (!env.VANBAN_BUCKET) {
    throw new Error(
      "Thiếu binding R2 'VANBAN_BUCKET'. Kiểm tra lại cấu hình wrangler.jsonc (mục r2_buckets)."
    );
  }
  return env.VANBAN_BUCKET;
}

/**
 * Lưu buffer vào Cloudflare R2, trả về object key dùng để tra cứu/tải lại sau này.
 * Key được sinh ngẫu nhiên (UUID) nên không cần lo path traversal khi đọc lại.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  mimeType?: string
): Promise<{ storageKey: string }> {
  const ext = extname(originalName);
  const storageKey = `${uuidv4()}${ext}`;
  await getBucket().put(storageKey, buffer, {
    httpMetadata: mimeType ? { contentType: mimeType } : undefined,
  });
  return { storageKey };
}

export async function readUploadedFile(storageKey: string): Promise<Buffer> {
  const obj = await getBucket().get(storageKey);
  if (!obj) {
    throw new Error("Không tìm thấy tệp trong kho lưu trữ (R2).");
  }
  const arrayBuffer = await obj.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteUploadedFile(storageKey: string): Promise<void> {
  try {
    await getBucket().delete(storageKey);
  } catch {
    // bỏ qua nếu tệp không tồn tại / lỗi xoá không quan trọng
  }
}
