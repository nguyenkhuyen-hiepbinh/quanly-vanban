# Hướng dẫn triển khai lên GitHub + Cloudflare (từng bước)

Tài liệu này dành cho người trực tiếp triển khai (bộ phận/nhân sự CNTT của trường). Toàn bộ ứng dụng chạy trên **Cloudflare Workers** - không cần thuê VPS, không cần cài đặt máy chủ.

> **Cách nhanh nhất**: nếu máy đang dùng có Node.js và kết nối Internet bình thường, có thể bỏ qua phần lớn các bước tay ở mục 5-6 bên dưới và chạy thẳng:
> ```bash
> export CLOUDFLARE_API_TOKEN="..."     # tạo tại dash.cloudflare.com/profile/api-tokens
> export CLOUDFLARE_ACCOUNT_ID="..."    # xem cách lấy ở mục 5
> bash scripts/deploy-cloudflare.sh
> ```
> Script này tự làm toàn bộ: tạo D1 + R2, chạy migration, tạo dữ liệu mẫu, đặt secret, build và deploy. An toàn để chạy lại nhiều lần (tự bỏ qua nếu tài nguyên đã tồn tại). Vẫn nên đọc phần "Chuẩn bị" và "Câu hỏi thường gặp" bên dưới trước khi chạy.

## 1. Kiến trúc & vì sao chọn Cloudflare

| Thành phần cũ (VPS) | Thành phần trên Cloudflare | Vai trò |
|---|---|---|
| Node.js server (PM2) | **Cloudflare Workers** | Chạy code Next.js (giao diện + API) |
| SQLite file (`data/app.db`) | **Cloudflare D1** | Cơ sở dữ liệu (văn bản, người dùng, phòng ban...) |
| Thư mục `uploads/` | **Cloudflare R2** | Lưu file văn bản gốc + bản đã đóng dấu |
| Nginx + Certbot (HTTPS) | Tự động (Cloudflare cấp HTTPS miễn phí) | Bảo mật kết nối |
| SSH deploy tay / script | **GitHub Actions** | Tự động deploy khi push code |

**Ưu điểm**: không cần thuê/quản lý máy chủ, tự động mở rộng theo lượng dùng, HTTPS + CDN miễn phí toàn cầu, chi phí gần như 0đ ở quy mô 1 trường học.

**Đánh đổi đã chấp nhận** (theo yêu cầu ban đầu): không có OCR, không đóng dấu tự động lên file ảnh (xem README.md mục "Nếu cần OCR trở lại").

### Chi phí ước tính (gói miễn phí Cloudflare)

- **Workers**: 100.000 lượt request/ngày miễn phí - dư dùng cho 1 trường học (vài trăm lượt/ngày).
- **D1**: 5GB dữ liệu + 5 triệu lượt đọc/ngày miễn phí.
- **R2**: 10GB lưu trữ file miễn phí, **không tính phí băng thông tải xuống** (khác AWS S3).

Với quy mô văn phòng 1 trường, các mức trên gần như chắc chắn đủ dùng miễn phí. Nếu vượt, Cloudflare tính phí theo lượng dùng thực tế (pay-as-you-go), không cần nâng gói trọn gói.

## 2. Chuẩn bị

- Tài khoản **Cloudflare** (đăng ký miễn phí tại [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)).
- Tài khoản **GitHub**.
- Máy tính có **Node.js 20 LTS** trở lên đã cài đặt.
- Mã nguồn dự án (thư mục `van-ban-app` đã nhận được).

## 3. Đưa mã nguồn lên GitHub

```bash
cd van-ban-app
git init                                   # nếu chưa có git
git add .
git commit -m "Khởi tạo dự án quản lý văn bản"

# Tạo repo mới trên GitHub (qua giao diện web github.com/new, hoặc dùng gh CLI):
gh repo create ten-truong-van-ban --private --source=. --remote=origin
git push -u origin main
```

> Repo nên để **Private** vì chứa cấu hình nội bộ (dù không chứa mật khẩu/secret thật - các secret luôn để riêng, không commit vào Git).

## 4. Cài đặt công cụ & đăng nhập Cloudflare

```bash
npm install
npx wrangler login       # mở trình duyệt, đăng nhập + cho phép Wrangler truy cập tài khoản Cloudflare
```

## 5. Tạo tài nguyên Cloudflare thật (chỉ làm 1 lần)

### 5.1. Tạo D1 database

```bash
npx wrangler d1 create van-ban-db
```

Lệnh trên in ra một đoạn cấu hình có `database_id`. Mở file `wrangler.jsonc`, tìm mục `d1_databases`, thay giá trị `"PLACEHOLDER_DATABASE_ID"` bằng `database_id` vừa nhận được.

### 5.2. Tạo R2 bucket

```bash
npx wrangler r2 bucket create van-ban-files
```

(Nếu muốn đổi tên bucket khác `van-ban-files`, sửa luôn `bucket_name` tương ứng trong `wrangler.jsonc`.)

### 5.3. Áp dụng migration (tạo bảng) lên D1 thật

```bash
npm run d1:migrate:remote
```

### 5.4. Tạo dữ liệu mẫu (tài khoản admin, phòng ban mẫu) trên D1 thật

```bash
npm run db:seed:gen          # sinh file drizzle/seed.sql
npm run d1:seed:remote       # áp dụng vào database thật trên Cloudflare
```

> Có thể bỏ qua bước này và tự tạo phòng ban/tài khoản đầu tiên sau khi deploy xong, thông qua giao diện quản trị - nhưng khi đó cần tự tạo tài khoản Admin đầu tiên bằng cách chạy tạm `db:seed:gen` + `d1:seed:remote` ít nhất 1 lần (giao diện chưa hỗ trợ "đăng ký" vì đây là hệ thống nội bộ, chỉ Admin mới tạo được tài khoản mới).

### 5.5. Đặt biến bí mật `AUTH_SECRET`

Đây là chuỗi bí mật dùng để ký phiên đăng nhập (JWT) - **không** đặt trong `wrangler.jsonc` (file này commit lên Git).

```bash
# Tạo chuỗi ngẫu nhiên:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Đặt secret trên Cloudflare (dán chuỗi vừa tạo khi được hỏi):
npx wrangler secret put AUTH_SECRET
```

## 6. Deploy lần đầu (thủ công)

```bash
npm run cf:deploy
```

Lệnh này build ứng dụng cho Cloudflare Workers rồi deploy. Sau khi chạy xong, Wrangler in ra địa chỉ dạng:

```
https://van-ban-app.<ten-subdomain-cua-ban>.workers.dev
```

Mở địa chỉ này để kiểm tra - đăng nhập bằng tài khoản mẫu (`admin` / `Admin@123`), **đổi mật khẩu ngay**.

## 7. Gắn tên miền riêng (tuỳ chọn, khuyến nghị)

Nếu trường có tên miền riêng (VD: `vanban.truongthpt.edu.vn`):

1. Vào **Cloudflare Dashboard → tên miền → DNS**, đảm bảo tên miền đã được quản lý bởi Cloudflare (chuyển nameserver nếu chưa).
2. Vào **Workers & Pages → chọn Worker `van-ban-app` → Settings → Domains & Routes → Add**, nhập tên miền phụ mong muốn (VD: `vanban.truongthpt.edu.vn`).
3. Cloudflare tự cấp HTTPS cho tên miền này, thường có hiệu lực sau vài phút.

## 8. Tự động deploy khi push code (GitHub Actions)

File `.github/workflows/deploy.yml` đã có sẵn trong dự án, tự động build + deploy mỗi khi push lên nhánh `main`. Chỉ cần khai báo 2 secret trên GitHub:

1. Vào repo trên GitHub → **Settings → Secrets and variables → Actions → New repository secret**.
2. Thêm:
   - `CLOUDFLARE_API_TOKEN`: tạo tại [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → chọn template **"Edit Cloudflare Workers"** → giới hạn theo tài khoản/zone cần thiết → **Continue to summary → Create Token** → copy chuỗi token (chỉ hiện 1 lần).
   - `CLOUDFLARE_ACCOUNT_ID`: xem trong Cloudflare Dashboard, cột phải trang tổng quan tài khoản (Account ID).

Từ lần push tiếp theo lên `main`, GitHub Actions sẽ tự: cài dependency → build → áp dụng migration D1 (nếu schema thay đổi) → deploy Worker. Theo dõi tiến trình ở tab **Actions** trên GitHub.

> Nếu schema (`src/db/schema.ts`) thay đổi, nhớ chạy `npm run db:generate` để sinh file migration mới **và commit file đó** trước khi push - GitHub Actions chỉ áp dụng migration đã có sẵn trong thư mục `drizzle/`, không tự sinh migration.

## 9. Theo dõi & xử lý sự cố

- **Xem log thời gian thực**: `npx wrangler tail` (chạy lệnh này rồi thao tác trên web app để thấy log ngay lập tức - hữu ích khi có lỗi 500).
- **Xem trạng thái D1/R2**: Cloudflare Dashboard → **Workers & Pages** / **D1** / **R2**.
- **Truy vấn D1 trực tiếp** (VD: kiểm tra dữ liệu): `npx wrangler d1 execute van-ban-db --remote --command="SELECT * FROM users"`.
- **Rollback**: Cloudflare Dashboard → Worker → **Deployments** → chọn bản deploy cũ → **Rollback**.

## 10. Sao lưu định kỳ

Nên thiết lập lịch (VD: hàng tuần) chạy:

```bash
npx wrangler d1 export van-ban-db --remote --output=backup-$(date +%Y%m%d).sql
```

và lưu file `.sql` này ra nơi khác (Google Drive, ổ cứng ngoài...). File văn bản trong R2 nên bật thêm sao lưu qua công cụ `rclone` (tương thích S3) nếu cần lưu song song ở nơi khác ngoài Cloudflare.

## 11. Câu hỏi thường gặp

**Q: Có thể vừa chạy trên Cloudflare vừa dùng tên miền GitHub Pages không?**
Không cần - GitHub trong kiến trúc này chỉ dùng để lưu mã nguồn + chạy Actions tự động deploy, **không host trực tiếp trang web**. Trang web thật sự chạy trên hạ tầng Cloudflare Workers.

**Q: Nếu cần đổi vùng lưu trữ dữ liệu (VD: yêu cầu dữ liệu phải nằm ở Việt Nam)?**
D1 và R2 hiện lưu trên hạ tầng toàn cầu của Cloudflare; nếu có yêu cầu bắt buộc dữ liệu phải đặt tại một quốc gia/vùng cụ thể, cần kiểm tra thêm tính năng "Jurisdictional Restrictions" của Cloudflare hoặc cân nhắc phương án hạ tầng khác - vấn đề này nằm ngoài phạm vi tài liệu này, nên tham khảo thêm chính sách của trường/Sở GD-ĐT trước khi triển khai chính thức.

**Q: Quên mật khẩu Admin duy nhất, không đăng nhập được để tạo lại thì sao?**
Chạy: `npx wrangler d1 execute van-ban-db --remote --command="UPDATE users SET must_change_password = 1 WHERE username = 'admin'"` rồi vào D1 cập nhật lại `password_hash` bằng một hash bcrypt mới (có thể sinh bằng đoạn script nhỏ dùng `bcryptjs`, tương tự cách `scripts/generate-seed-sql.ts` đang làm).
