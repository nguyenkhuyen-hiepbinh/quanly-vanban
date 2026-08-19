-- Dữ liệu mẫu ban đầu - sinh tự động bởi scripts/generate-seed-sql.ts
-- KHÔNG sửa tay file này, hãy sửa scripts/generate-seed-sql.ts rồi chạy lại `npm run db:seed:gen`.

INSERT OR IGNORE INTO settings (key, value) VALUES ('orgName', 'TRƯỜNG THPT VÍ DỤ');

INSERT OR IGNORE INTO departments (code, name, description) VALUES ('DT', 'Phòng Đào tạo', 'Phụ trách chuyên môn, giảng dạy');
INSERT OR IGNORE INTO departments (code, name, description) VALUES ('KT', 'Phòng Kế toán - Tài vụ', 'Phụ trách tài chính, kế toán');
INSERT OR IGNORE INTO departments (code, name, description) VALUES ('VP', 'Văn phòng', 'Hành chính - Văn thư');

INSERT OR IGNORE INTO users (username, password_hash, full_name, role, department_id, must_change_password) VALUES ('admin', '$2a$10$uJ31eYHu4wG5wiP/IlhIl.wO9ZuCXHnQ50gKCxQY8qmTjjqnOov8.', 'Quản trị viên hệ thống', 'ADMIN', NULL, 1);
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, department_id, must_change_password) VALUES ('vanthu', '$2a$10$L4DXT.BuwYkH5X9JnQKIHOG4hKASatJU2kGNWCZJj0CYr4Nx55cye', 'Nguyễn Thị Văn Thư', 'VANTHU', (SELECT id FROM departments WHERE code = 'VP'), 1);
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, department_id, must_change_password) VALUES ('truongphong.dt', '$2a$10$w9fm6tEd4seHaqIg2pK/AeVXgyc3uYZHjZLqOiZkPLrk1t89420o.', 'Trần Văn Đào Tạo', 'TRUONGPHONG', (SELECT id FROM departments WHERE code = 'DT'), 1);
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, department_id, must_change_password) VALUES ('truongphong.kt', '$2a$10$w9fm6tEd4seHaqIg2pK/AeVXgyc3uYZHjZLqOiZkPLrk1t89420o.', 'Lê Thị Kế Toán', 'TRUONGPHONG', (SELECT id FROM departments WHERE code = 'KT'), 1);

