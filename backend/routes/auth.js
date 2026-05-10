// backend/routes/auth.js
// Route Auth — Mỏng: chỉ nhận request, gọi Mediator, trả response

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { validateRegister, validateLogin } = require("../utils/validators");

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// ĐĂNG KÝ / ĐĂNG NHẬP / ĐĂNG XUẤT
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/register — Tạo tài khoản mới
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = validateRegister(req.body);
    res.json(await Mediator.Auth.register(username, email, password));
  } catch (err) { next(err); }
});

// POST /api/auth/login — Đăng nhập, nhận JWT token
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    res.json(await Mediator.Auth.login(email, password));
  } catch (err) { next(err); }
});

// POST /api/auth/logout — Đăng xuất, is_online = false (cần đăng nhập)
router.post("/logout", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.logout(req.userId));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// HỒ SƠ CÁ NHÂN
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/auth/profile — Xem thông tin cá nhân (cần đăng nhập)
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.getProfile(req.userId));
  } catch (err) { next(err); }
});

// PUT /api/auth/profile — Cập nhật username, email (cần đăng nhập)
router.put("/profile", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.updateProfile(req.userId, req.body));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUÊN MẬT KHẨU — 2 bước, không cần đăng nhập
//
// BƯỚC 1: User nhập email → backend gửi OTP 6 số về email
//         POST /api/auth/forgot-password
//         Body: { email }
//
// BƯỚC 2: User nhập OTP + mật khẩu mới → backend xác nhận → đổi mật khẩu
//         POST /api/auth/reset-password
//         Body: { email, otp, new_password }
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/forgot-password
// Gửi OTP về email để đặt lại mật khẩu
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email cơ bản
    if (!email || !email.includes("@"))
      return res.status(400).json({ message: "Email không hợp lệ" });

    res.json(await Mediator.Auth.forgotPassword(email.trim().toLowerCase()));
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
// Xác nhận OTP + đặt mật khẩu mới
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, otp, new_password } = req.body;

    // Validate đầu vào
    if (!email)        return res.status(400).json({ message: "Thiếu email" });
    if (!otp)          return res.status(400).json({ message: "Thiếu mã OTP" });
    if (!new_password) return res.status(400).json({ message: "Thiếu mật khẩu mới" });

    res.json(await Mediator.Auth.resetPassword(
      email.trim().toLowerCase(),
      otp.toString().trim(),
      new_password
    ));
  } catch (err) { next(err); }
});

module.exports = router;