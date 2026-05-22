// backend/routes/auth.js

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { validateRegister, validateLogin } = require("../utils/validators");
const db = require("../db");

const router = express.Router();

// ── Không cần đăng nhập ──────────────────────────────────────────────────────

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = validateRegister(req.body);
    res.json(await Mediator.Auth.register(username, email, password));
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    res.json(await Mediator.Auth.login(email, password));
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
// Bước 1: nhập email → nhận OTP 6 số qua email
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@"))
      return res.status(400).json({ message: "Email không hợp lệ" });
    res.json(await Mediator.Auth.forgotPassword(email.trim().toLowerCase()));
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
// Bước 2: nhập OTP + mật khẩu mới → đổi mật khẩu
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, otp, new_password } = req.body;
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

// ── Cần đăng nhập ────────────────────────────────────────────────────────────

// POST /api/auth/logout
router.post("/logout", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.logout(req.userId));
  } catch (err) { next(err); }
});

// GET /api/auth/profile
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.getProfile(req.userId));
  } catch (err) { next(err); }
});

// PUT /api/auth/profile
router.put("/profile", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Auth.updateProfile(req.userId, req.body));
  } catch (err) { next(err); }
});

/*---------------------------------------------------------------- */
// Hàm tạo ID ngẫu nhiên 6 ký tự (VD: 4A2B91)
const generateAccountId = () => Math.random().toString(36).substring(2, 8).toUpperCase();
router.post("/open-account", verifyToken, (req, res) => {
    const { leverage, typeAccount } = req.body;

    const accountId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 👇 QUAN TRỌNG: lấy userId từ token
    const userId = req.userId;

    console.log("USER ID:", userId);

    // ❌ check thiếu typeAccount
    if (!typeAccount) {
        return res.status(400).json({ message: "Thiếu typeAccount" });
    }

    const sql = `
        INSERT INTO accounts 
        (account_id, user_id, balance, leverage, typeAccount) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [accountId, userId, 10000, leverage || 100, typeAccount],
        (err, result) => {
            if (err) {
                console.error("Lỗi MySQL:", err.message);
                return res.status(500).json({
                    message: "Lỗi DB",
                    error: err.message,
                });
            }

            res.json({
                message: "Mở tài khoản thành công!",
                account_id: accountId,
            });
        }
    );
});

router.get("/account", verifyToken, (req, res) => {
    const userId = req.userId;

    console.log("GET USER ID:", userId);

    const sql = `
        SELECT account_id, balance, used_margin, leverage, account_type 
        FROM accounts 
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Lỗi lấy dữ liệu" });
        }

        console.log("DATA:", results);

        res.json(results);
    });
});


module.exports = router;