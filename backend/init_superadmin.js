// backend/init_superadmin.js
// Chạy 1 lần duy nhất để tạo tài khoản superadmin
// Lệnh: node init_superadmin.js
//
// Lưu ý: Chạy sau khi đã tạo database và bảng users xong

require("dotenv").config();
const bcrypt = require("bcrypt");
const db     = require("./db");

async function createSuperAdmin() {
  const email    = "tradingnova.platform.demo@gmail.com";
  const password = "@Tradingnova999";
  const username = "superadmin";

  try {
    // Kiểm tra đã tồn tại chưa
    const [existing] = await db.queryAsync(
      "SELECT user_id FROM users WHERE email=? OR role='superadmin'",
      [email]
    );
    if (existing) {
      console.log("⚠️  Superadmin đã tồn tại, bỏ qua.");
      process.exit(0);
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Tạo user superadmin
    const { insertId: userId } = await db.queryAsync(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'superadmin')",
      [username, email, hash]
    );

    // Tạo 2 tài khoản REAL + DEMO cho superadmin
    await db.queryAsync(
      "INSERT INTO accounts (user_id, account_type, balance, leverage) VALUES (?, 'REAL', 0, 100)",
      [userId]
    );
    await db.queryAsync(
      "INSERT INTO accounts (user_id, account_type, balance, leverage) VALUES (?, 'DEMO', 10000, 100)",
      [userId]
    );

    console.log("✅ Tạo superadmin thành công!");
    console.log(`   Email   : ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role    : superadmin`);
    console.log("\n⚠️  Đổi mật khẩu ngay sau khi đăng nhập lần đầu!");

  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();