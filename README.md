# Hệ thống Quản lý Văn bản Đến - Đi

Web app số hoá, lưu trữ và xử lý văn bản đến / văn bản đi cho trường học hoặc cơ quan, đơn vị. Tự động đóng dấu "CÔNG VĂN ĐẾN" (theo mẫu Nghị định 30/2020/NĐ-CP) lên văn bản PDF khi tiếp nhận, phân quyền Admin - Văn thư - Trưởng phòng ban. Chạy hoàn toàn trên **Cloudflare Workers** (không cần thuê VPS/máy chủ riêng).

## Tính năng chính

- **Số hoá văn bản đến**: tải lên PDF/ảnh/Word, hệ thống tự sinh Số đến theo năm (đảm bảo không trùng dù nhiều người thao tác cùng lúc) và đóng dấu "CÔNG VĂN ĐẾN" (Tên cơ quan, Số đến, Ngày đến, Chuyển, Lưu hồ sơ số) trực tiếp vào file PDF.
- **Văn bản đi**: tạo, tự sinh số thứ tự theo năm, gắn phòng ban soạn thảo.
- **Phân quyền 3 cấp**:
  - *Quản trị hệ thống (Admin)*: quản lý phòng ban, tài khoản, cấu hình chung, xem/quản lý toàn bộ văn bản.
  - *Văn thư*: tiếp nhận, số hoá, đóng dấu, chuyển phòng ban xử lý văn bản đến; tạo văn bản đi.
  - *Trưởng phòng ban*: chỉ xem/xử lý văn bản của phòng ban mình, phân công người xử lý, cập nhật trạng thái.
- **Theo dõi xử lý**: trạng thái, hạn xử lý, cảnh báo quá hạn, lịch sử xử lý đầy đủ theo từng văn bản.
- **Tìm kiếm & lọc**: theo trích yếu, số hiệu, nơi gửi/nhận, trạng thái, phòng ban.

> **Lưu ý về phạm vi tính năng**: bản chạy trên Cloudflare Workers này **không có OCR** (nhận dạng chữ trong ảnh/PDF scan) và **không đóng dấu tự động lên file ảnh** (JPG/PNG) - hai tính năng đó cần các thư viện chạy native (tesseract.js, sharp) mà Cloudflare Workers không hỗ trợ. Ảnh và file Word vẫn tải lên, lưu trữ và số hoá bình thường, chỉ không có dấu vẽ tự động lên chính tệp. Nếu bắt buộc cần OCR/đóng dấu ảnh, xem phần "Nếu cần OCR trở lại" bên dưới.

## Công nghệ sử dụng

- **Next.js 16** (App Router, TypeScript) - giao diện + API trong một dự án duy nhất.
- **Cloudflare Workers** (qua adapter `@opennextjs/cloudflare`) - nơi chạy ứng dụng, không cần VPS.
- **Cloudflare D1** (SQLite phân tán, qua `drizzle-orm/d1`) - cơ sở dữ liệu chính.
- **Cloudflare R2** - lưu trữ file văn bản gốc + bản đã đóng dấu.
- **pdf-lib** - đóng dấu công văn đến lên file PDF (vector, giữ chất lượng gốc).
- **jose + bcryptjs** - xác thực phiên đăng nhập (JWT lưu cookie httpOnly) và mã hoá mật khẩu.
- **GitHub + GitHub Actions** - lưu mã nguồn và (tuỳ chọn) tự động deploy khi push lên nhánh `main`.

Xem hướng dẫn triển khai chi tiết từng bước tại **[HUONG-DAN-CLOUDFLARE.md](./HUONG-DAN-CLOUDFLARE.md)**.

## Yêu cầu

- **Node.js 20 LTS trở lên**.
- Tài khoản **Cloudflare** (miễn phí đủ dùng ở quy mô 1 trường học - xem chi phí ước tính trong HUONG-DAN-CLOUDFLARE.md).
- Tài khoản **GitHub** để lưu mã nguồn (không bắt buộc nếu chỉ deploy tay bằng `wrangler`).

## Chạy thử trên máy cá nhân (development)

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file .env.local (xem mẫu .env.example) và điền AUTH_SECRET
cp .env.example .env.local

# 3. Đăng nhập Cloudflare (chỉ cần làm 1 lần / máy)
npx wrangler login

# 4. Tạo D1 database + R2 bucket THẬT trên Cloudflare (chỉ cần làm 1 lần cho cả team)
#    rồi dán "database_id" trả về vào wrangler.jsonc (xem chi tiết trong HUONG-DAN-CLOUDFLARE.md)
npx wrangler d1 create van-ban-db
npx wrangler r2 bucket create van-ban-files

# 5. Sinh + áp dụng migration và dữ liệu mẫu cho database LOCAL (giả lập trên máy, chưa đụng tới
#    dữ liệu thật trên Cloudflare)
npm run setup:local

# 6. Chạy thử với Wrangler (mô phỏng đầy đủ môi trường Workers, gồm D1/R2/Assets)
npm run cf:build
npx wrangler dev
```

Mở trình duyệt tại `http://localhost:8787`.

(Có thể dùng `npm run dev` để chạy `next dev` thường - hot reload nhanh hơn - nhưng cách này cũng đã được cấu hình để dùng chung binding D1/R2 local nhờ `initOpenNextCloudflareForDev()` trong `next.config.mjs`.)

### Tài khoản mẫu (tạo bởi `npm run setup:local` / `db:seed:gen`)

| Tên đăng nhập     | Mật khẩu        | Vai trò                    |
|-------------------|------------------|-----------------------------|
| `admin`           | `Admin@123`      | Quản trị hệ thống            |
| `vanthu`          | `VanThu@123`     | Văn thư                      |
| `truongphong.dt`  | `TruongPhong@123`| Trưởng phòng Đào tạo         |
| `truongphong.kt`  | `TruongPhong@123`| Trưởng phòng Kế toán - Tài vụ|

> **Quan trọng**: đây là mật khẩu mẫu, hãy đổi ngay sau khi đăng nhập lần đầu (hệ thống sẽ tự nhắc). Với môi trường thật, nên tạo tài khoản admin riêng rồi xoá/khoá các tài khoản mẫu này.

## Triển khai lên Cloudflare (production)

Xem hướng dẫn đầy đủ, từng bước tại **[HUONG-DAN-CLOUDFLARE.md](./HUONG-DAN-CLOUDFLARE.md)** - bao gồm: tạo tài nguyên Cloudflare thật, deploy tay bằng `wrangler`, và deploy tự động qua GitHub Actions mỗi khi push code.

Tóm tắt lệnh deploy tay:

```bash
npm run cf:deploy
# tương đương: npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy
```

## Cấu trúc dự án (tóm tắt)

```
src/
  app/                  # Các trang (App Router) + API routes (app/api/**)
  components/           # Giao diện dùng chung (form, bảng, sidebar...)
  db/                    # Schema Drizzle + hàm lấy kết nối D1 (getDb())
  lib/                   # Nghiệp vụ: xác thực, đóng dấu, lưu trữ R2, đánh số, phân quyền
public/
  fonts/                 # Font DejaVu Sans (hỗ trợ tiếng Việt) dùng để đóng dấu PDF - nạp lúc
                          # runtime qua Cloudflare Assets binding, không dùng filesystem
drizzle/                 # File SQL migration (sinh bởi `npm run db:generate`) + seed.sql
scripts/
  generate-seed-sql.ts   # Sinh file drizzle/seed.sql (tài khoản mẫu, bcrypt hash tính sẵn)
wrangler.jsonc            # Cấu hình Cloudflare Workers (D1, R2, Assets, biến môi trường)
open-next.config.ts       # Cấu hình adapter OpenNext cho Cloudflare
```

## Cấu hình dấu công văn đến

Vào **Quản trị hệ thống → Cấu hình hệ thống** (chỉ Admin) để đặt "Tên cơ quan/đơn vị" hiển thị trên dấu. Mẫu dấu gồm 4 trường theo đúng quy định tại Nghị định 30/2020/NĐ-CP: **Số đến, Ngày đến, Chuyển, Lưu hồ sơ số**.

- Với file PDF: dấu được vẽ trực tiếp (vector) vào trang đầu tiên - **duy nhất định dạng được hỗ trợ đóng dấu tự động**.
- Với file ảnh (JPG/PNG) hoặc Word (.doc/.docx): vẫn lưu trữ, số hoá, gắn Số đến bình thường, nhưng không có dấu vẽ tự động lên tệp - có thể đóng dấu tay rồi tải file đã đóng dấu lên bổ sung nếu cần.

## Sao lưu dữ liệu

Dữ liệu nằm ở 2 nơi trên Cloudflare, không nằm trên máy chủ nào cả:

- **D1** (`van-ban-db`) - thông tin văn bản, người dùng, phòng ban... Xuất bản sao lưu định kỳ bằng: `npx wrangler d1 export van-ban-db --remote --output=backup.sql`
- **R2** (`van-ban-files`) - toàn bộ tệp văn bản gốc và bản đã đóng dấu. Có thể đồng bộ ra máy khác bằng công cụ `rclone` (Cloudflare R2 tương thích S3) hoặc bật R2 versioning/replication trong Cloudflare Dashboard.

## Nếu cần OCR trở lại

OCR (tesseract.js) và đóng dấu ảnh (sharp) không chạy được trên Cloudflare Workers do cần native binding. Nếu bắt buộc cần các tính năng này, có 2 hướng:

1. **Kiến trúc lai**: giữ web app trên Cloudflare Workers như hiện tại, nhưng thêm 1 Cloudflare Worker/Queue riêng gọi ra một dịch vụ OCR bên ngoài (VD: Cloudflare Workers AI có model OCR, hoặc một API OCR của bên thứ ba) - không cần quay lại VPS.
2. **Quay lại chạy Node.js truyền thống** (VPS/on-premise) - phục hồi lại `tesseract.js` + `sharp` + `better-sqlite3` như bản gốc trước khi chuyển sang Cloudflare (có trong lịch sử Git nếu dùng Git để quản lý mã nguồn).

## Giới hạn hiện tại / hướng mở rộng thêm

- Đóng dấu tự động chỉ hỗ trợ PDF; ảnh (JPG/PNG) và Word chưa hỗ trợ đóng dấu tự động (xem phần trên).
- Không có OCR / tìm kiếm toàn văn nội dung scan.
- Chưa có tính năng gửi email/thông báo nhắc hạn xử lý tự động - có thể bổ sung bằng Cloudflare Cron Triggers gọi tới logic kiểm tra văn bản quá hạn.
- Vai trò hiện có: Admin, Văn thư, Trưởng phòng ban. Có thể mở rộng thêm vai trò "Nhân viên phòng ban" (chỉ xử lý văn bản được giao) nếu cần chi tiết hơn.
