// backend/mediators/authMediator.js (v2)
// Thay đổi: register() tạo 2 tài khoản cho mỗi user
//   - 1 tài khoản REAL: balance = 0
//   - 1 tài khoản DEMO: balance = 10000 (tiền ảo)

const bcrypt        = require("bcrypt");
const jwt           = require("jsonwebtoken");
const { q, transaction } = require("./helpers");
const { sendOTP }   = require("../utils/mailer");

// ── Helpers OTP (dùng chung với walletMediator) ──────────────────────────────
async function saveOTP(userId) {
  const otp     = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000);
  await q("UPDATE users SET verify_code=?, verify_code_expires=? WHERE user_id=?", [otp, expires, userId]);
  return otp;
}

function checkOTP(user, otp) {
  if (!user.verify_code)                          throw new Error("Chưa yêu cầu mã OTP");
  if (user.verify_code !== otp.toString().trim()) throw new Error("Mã OTP không đúng");
  if (new Date() > new Date(user.verify_code_expires)) throw new Error("Mã OTP đã hết hạn");
}

const clearOTP = (userId) =>
  q("UPDATE users SET verify_code=NULL, verify_code_expires=NULL WHERE user_id=?", [userId]);

// ─────────────────────────────────────────────────────────────────────────────
const Auth = {

  // POST /api/auth/register
  // Tạo user + 2 tài khoản: REAL (balance=0) + DEMO (balance=10000)
  async register(username, email, password) {
    const hash = await bcrypt.hash(password, 10);
    return transaction(async (run) => {
      try {
        // 1. Tạo user
        const { insertId: userId } = await run(
          "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
          [username, email, hash]
        );

        // 2. Tạo tài khoản REAL — balance = 0, cần nạp tiền thật mới trade được
        await run(
          "INSERT INTO accounts (user_id, account_type, balance, leverage) VALUES (?, 'REAL', 0, 100)",
          [userId]
        );

        // 3. Tạo tài khoản DEMO — balance = 10000 tiền ảo, dùng luyện tập
        await run(
          "INSERT INTO accounts (user_id, account_type, balance, leverage) VALUES (?, 'DEMO', 10000, 100)",
          [userId]
        );

        return { message: "Đăng ký thành công", userId };
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new Error("Username hoặc email đã tồn tại");
        throw err;
      }
    });
  },

  // POST /api/auth/login
  async login(email, password) {
    const [user] = await q("SELECT * FROM users WHERE email=?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw new Error("Sai email hoặc mật khẩu");
    if (user.status_account === "blocked") throw new Error("Tài khoản đã bị khóa");

    await q("UPDATE users SET is_online=TRUE WHERE user_id=?", [user.user_id]);

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    return { message: "Đăng nhập thành công", token };
  },

  // POST /api/auth/logout
  async logout(userId) {
    await q("UPDATE users SET is_online=FALSE WHERE user_id=?", [userId]);
    return { message: "Đăng xuất thành công" };
  },

  // GET /api/auth/profile
  async getProfile(userId) {
    const [user] = await q(
      "SELECT user_id, username, email, phone, role, avatar, created_at FROM users WHERE user_id=?",
      [userId]
    );
    if (!user) throw new Error("Không tìm thấy user");
    return user;
  },

  // PUT /api/auth/profile
  async updateProfile(userId, { username, email, phone, avatar }) {
    if (!username?.trim()) throw new Error("Username không được trống");
    if (!email?.trim())    throw new Error("Email không được trống");
    const result = await q(
      "UPDATE users SET username=?, email=?, phone=?, avatar=? WHERE user_id=?",
      [username.trim(), email.trim(), phone, avatar, userId]
    );
    if (result.affectedRows === 0) throw new Error("Không tìm thấy user");
    return { message: "Cập nhật thành công" };
  },

  // POST /api/auth/forgot-password
  async forgotPassword(email) {
    const [user] = await q("SELECT user_id, email FROM users WHERE email=?", [email]);
    if (!user) return { message: "Nếu email tồn tại, mã OTP đã được gửi." };
    const otp = await saveOTP(user.user_id);
    await sendOTP(user.email, otp, "reset");
    return { message: "Nếu email tồn tại, mã OTP đã được gửi." };
  },

  // POST /api/auth/reset-password
  async resetPassword(email, otp, newPassword) {
    if (!newPassword || newPassword.length < 8)
      throw new Error("Mật khẩu mới phải từ 8 ký tự trở lên");
    const [user] = await q(
      "SELECT user_id, verify_code, verify_code_expires FROM users WHERE email=?",
      [email]
    );
    if (!user) throw new Error("Email không tồn tại");
    checkOTP(user, otp);
    const hash = await bcrypt.hash(newPassword, 10);
    await q("UPDATE users SET password_hash=? WHERE user_id=?", [hash, user.user_id]);
    await clearOTP(user.user_id);
    return { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." };
  },
};

module.exports = { Auth, saveOTP, checkOTP, clearOTP };