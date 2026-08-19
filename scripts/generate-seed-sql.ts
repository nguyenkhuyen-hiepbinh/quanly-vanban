/**
 * Sinh file SQL dữ liệu mẫu ban đầu cho Cloudflare D1 (phòng ban + tài khoản admin/văn thư/
 * trưởng phòng + tên đơn vị mặc định).
 *
 * Vì D1 không chạy được script Node có kết nối DB trực tiếp như better-sqlite3 trước đây,
 * cách chạy seed trên D1 là: sinh sẵn 1 file .sql (bcrypt hash được tính trước ở đây, chạy
 * bằng Node) rồi áp dụng file đó bằng lệnh `wrangler d1 execute`.
 *
 * Sử dụng:
 *   npm run db:seed:gen
 *   npx wrangler d1 execute van-ban-db --local  --file=./drizzle/seed.sql   (máy dev / Miniflare)
 *   npx wrangler d1 execute van-ban-db --remote --file=./drizzle/seed.sql   (database thật trên Cloudflare)
 *
 * An toàn để chạy lại nhiều lần: dùng INSERT OR IGNORE, không tạo trùng dữ liệu nếu đã tồn tại.
 */
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function main() {
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const vanThuHash = await bcrypt.hash("VanThu@123", 10);
  const truongPhongHash = await bcrypt.hash("TruongPhong@123", 10);

  const lines: string[] = [];
  lines.push("-- Dữ liệu mẫu ban đầu - sinh tự động bởi scripts/generate-seed-sql.ts");
  lines.push("-- KHÔNG sửa tay file này, hãy sửa scripts/generate-seed-sql.ts rồi chạy lại `npm run db:seed:gen`.");
  lines.push("");

  lines.push(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('orgName', '${sqlEscape(
      "TRƯỜNG THPT VÍ DỤ"
    )}');`
  );
  lines.push("");

  const departments: [string, string, string][] = [
    ["DT", "Phòng Đào tạo", "Phụ trách chuyên môn, giảng dạy"],
    ["KT", "Phòng Kế toán - Tài vụ", "Phụ trách tài chính, kế toán"],
    ["VP", "Văn phòng", "Hành chính - Văn thư"],
  ];
  for (const [code, name, desc] of departments) {
    lines.push(
      `INSERT OR IGNORE INTO departments (code, name, description) VALUES ('${sqlEscape(
        code
      )}', '${sqlEscape(name)}', '${sqlEscape(desc)}');`
    );
  }
  lines.push("");

  type SeedUser = {
    username: string;
    hash: string;
    fullName: string;
    role: "ADMIN" | "VANTHU" | "TRUONGPHONG";
    deptCode: string | null;
  };
  const seedUsers: SeedUser[] = [
    { username: "admin", hash: adminHash, fullName: "Quản trị viên hệ thống", role: "ADMIN", deptCode: null },
    { username: "vanthu", hash: vanThuHash, fullName: "Nguyễn Thị Văn Thư", role: "VANTHU", deptCode: "VP" },
    { username: "truongphong.dt", hash: truongPhongHash, fullName: "Trần Văn Đào Tạo", role: "TRUONGPHONG", deptCode: "DT" },
    { username: "truongphong.kt", hash: truongPhongHash, fullName: "Lê Thị Kế Toán", role: "TRUONGPHONG", deptCode: "KT" },
  ];

  for (const u of seedUsers) {
    const deptExpr = u.deptCode
      ? `(SELECT id FROM departments WHERE code = '${sqlEscape(u.deptCode)}')`
      : "NULL";
    lines.push(
      `INSERT OR IGNORE INTO users (username, password_hash, full_name, role, department_id, must_change_password) ` +
        `VALUES ('${sqlEscape(u.username)}', '${sqlEscape(u.hash)}', '${sqlEscape(
          u.fullName
        )}', '${u.role}', ${deptExpr}, 1);`
    );
  }
  lines.push("");

  const outPath = path.join(process.cwd(), "drizzle", "seed.sql");
  await fs.writeFile(outPath, lines.join("\n") + "\n", "utf8");

  console.log("✔ Đã sinh file:", outPath);
  console.log("");
  console.log("Tài khoản mẫu (đổi mật khẩu ngay sau khi đăng nhập lần đầu):");
  console.log("  - admin / Admin@123 (Quản trị hệ thống)");
  console.log("  - vanthu / VanThu@123 (Văn thư)");
  console.log("  - truongphong.dt / TruongPhong@123 (Trưởng phòng Đào tạo)");
  console.log("  - truongphong.kt / TruongPhong@123 (Trưởng phòng Kế toán)");
  console.log("");
  console.log("Áp dụng vào D1:");
  console.log("  npx wrangler d1 execute van-ban-db --local  --file=./drizzle/seed.sql");
  console.log("  npx wrangler d1 execute van-ban-db --remote --file=./drizzle/seed.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
