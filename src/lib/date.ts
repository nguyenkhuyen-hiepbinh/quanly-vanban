/**
 * Ngày dương lịch hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7), định dạng
 * "YYYY-MM-DD".
 *
 * KHÔNG dùng `new Date().toISOString().slice(0, 10)` cho việc này: Cloudflare Workers chạy
 * theo giờ UTC bất kể người dùng ở đâu, nên trong khoảng 00:00-06:59 giờ Việt Nam (tức
 * 17:00-23:59 UTC của ngày hôm trước), cách tính đó sẽ cho ra ngày SAI (chậm mất 1 ngày) -
 * ảnh hưởng trực tiếp tới "Ngày đến" ghi trên dấu Công văn đến và lưu trong hồ sơ, vốn phải
 * đúng theo giờ hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).
 */
export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Năm dương lịch hiện tại theo giờ Việt Nam - dùng để đánh Số đến/Số đi khi không có ngày văn bản. */
export function yearVN(): number {
  return Number(todayVN().slice(0, 4));
}

/** Chuyển ngày ISO "YYYY-MM-DD" sang định dạng "dd/mm/yyyy" để in trên dấu/hiển thị. */
export function formatDateVi(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
