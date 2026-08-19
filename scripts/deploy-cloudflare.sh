#!/usr/bin/env bash
# Script triển khai tự động lên Cloudflare - chạy 1 lần cho lần deploy đầu tiên (và có thể
# chạy lại an toàn cho các lần sau, các bước tạo tài nguyên sẽ tự bỏ qua nếu đã tồn tại).
#
# YÊU CẦU TRƯỚC KHI CHẠY:
#   1. Máy đang chạy script này phải có kết nối Internet bình thường (không chạy được trong
#      sandbox của Claude vì môi trường đó bị chặn truy cập ra ngoài tới api.cloudflare.com).
#   2. Đã cài Node.js 20 trở lên.
#   3. Đã có API Token Cloudflare (tạo tại https://dash.cloudflare.com/profile/api-tokens,
#      chọn template "Edit Cloudflare Workers") và Account ID.
#
# CÁCH CHẠY:
#   export CLOUDFLARE_API_TOKEN="dán-token-vao-day"
#   export CLOUDFLARE_ACCOUNT_ID="dán-account-id-vao-day"
#   bash scripts/deploy-cloudflare.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "❌ Thiếu biến môi trường CLOUDFLARE_API_TOKEN và/hoặc CLOUDFLARE_ACCOUNT_ID."
  echo "   Xem hướng dẫn ở đầu file này (scripts/deploy-cloudflare.sh)."
  exit 1
fi

DB_NAME="van-ban-db"
BUCKET_NAME="van-ban-files"

echo "▶ 1/8 Cài dependency..."
npm install

echo "▶ 2/8 Kiểm tra đăng nhập Cloudflare..."
npx wrangler whoami

echo "▶ 3/8 Tạo (hoặc dùng lại) D1 database '$DB_NAME'..."
if npx wrangler d1 info "$DB_NAME" >/dev/null 2>&1; then
  echo "   Database '$DB_NAME' đã tồn tại, bỏ qua bước tạo."
else
  npx wrangler d1 create "$DB_NAME"
fi

DB_ID=$(npx wrangler d1 info "$DB_NAME" --json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).uuid)}catch(e){process.exit(1)}})")
if [ -z "$DB_ID" ]; then
  echo "❌ Không lấy được database_id của '$DB_NAME'. Hãy tự chạy 'npx wrangler d1 info $DB_NAME' và điền tay vào wrangler.jsonc."
  exit 1
fi
echo "   database_id: $DB_ID"

echo "▶ 4/8 Cập nhật wrangler.jsonc với database_id thật..."
node -e "
const fs = require('fs');
const path = 'wrangler.jsonc';
let raw = fs.readFileSync(path, 'utf8');
raw = raw.replace(/\"database_id\":\s*\"[^\"]*\"/, '\"database_id\": \"$DB_ID\"');
fs.writeFileSync(path, raw);
console.log('   Đã cập nhật wrangler.jsonc');
"

echo "▶ 5/8 Tạo (hoặc dùng lại) R2 bucket '$BUCKET_NAME'..."
if npx wrangler r2 bucket list --json 2>/dev/null | grep -q "\"name\": *\"$BUCKET_NAME\""; then
  echo "   Bucket '$BUCKET_NAME' đã tồn tại, bỏ qua bước tạo."
else
  npx wrangler r2 bucket create "$BUCKET_NAME" || echo "   (Có thể bucket đã tồn tại - bỏ qua lỗi này)"
fi

echo "▶ 6/8 Áp dụng migration D1 (tạo bảng)..."
npx wrangler d1 migrations apply "$DB_NAME" --remote

echo "▶ 7/8 Tạo dữ liệu mẫu (tài khoản admin/văn thư/trưởng phòng)..."
npm run db:seed:gen
npx wrangler d1 execute "$DB_NAME" --remote --file=./drizzle/seed.sql

echo "▶ 8/8 Đặt secret AUTH_SECRET (nếu chưa có) rồi build + deploy..."
if ! npx wrangler secret list 2>/dev/null | grep -q "\"name\": *\"AUTH_SECRET\""; then
  AUTH_SECRET_VALUE=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "$AUTH_SECRET_VALUE" | npx wrangler secret put AUTH_SECRET
  echo "   Đã tạo AUTH_SECRET mới (ngẫu nhiên, không cần ghi nhớ - chỉ dùng nội bộ để ký phiên đăng nhập)."
else
  echo "   AUTH_SECRET đã tồn tại, giữ nguyên."
fi

npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

echo ""
echo "✅ Hoàn tất! Mở địa chỉ Worker in ra ở trên để kiểm tra (dạng https://van-ban-app.<subdomain>.workers.dev)."
echo "   Đăng nhập bằng: admin / Admin@123 - và ĐỔI MẬT KHẨU NGAY."
