// backend/routes/transactions.js
// Nạp tiền (QR), Rút tiền + OTP Email, Lịch sử

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { ValidationError } = require("../utils/errors");

const router = express.Router();

// Helper: validate số tiền
function parseAmount(raw) {
  const amount = parseFloat(raw);
  if (!raw || isNaN(amount) || amount <= 0)
    throw new ValidationError("Validation failed", { amount: "Số tiền phải lớn hơn 0" });
  return amount;
}

// ─────────────────────────────────────────────────────────────────────────────
// NẠP TIỀN QR
// ─────────────────────────────────────────────────────────────────────────────

// BƯỚC 1: Tạo QR nạp tiền
// POST /api/transactions/deposit
// Body: { amount }  →  Response: { qr_url, reference_code, transaction_id }
router.post("/deposit", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    res.json(await Mediator.Wallet.deposit(req.userId, amount));
  } catch (err) { next(err); }
});

// BƯỚC 2: User bấm "Đã thanh toán" → chờ admin xác nhận
// POST /api/transactions/deposit/:id/paid
router.post("/deposit/:id/paid", verifyToken, async (req, res, next) => {
  try {
    const transactionId = parseInt(req.params.id);
    if (!transactionId) throw new Error("Transaction ID không hợp lệ");
    res.json(await Mediator.Wallet.markAsPaid(req.userId, transactionId));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RÚT TIỀN + OTP EMAIL (2 bước)
//
// Luồng:
//   BƯỚC 1: User nhập số tiền → backend gửi OTP 6 số về email
//   BƯỚC 2: User nhập OTP → backend xác nhận → trừ tiền
// ─────────────────────────────────────────────────────────────────────────────

// BƯỚC 1: Yêu cầu rút tiền → gửi OTP email
// POST /api/transactions/withdraw/request
// Body: { amount }
router.post("/withdraw/request", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    res.json(await Mediator.Wallet.requestWithdraw(req.userId, amount));
  } catch (err) { next(err); }
});

// BƯỚC 2: Xác nhận OTP → thực hiện rút tiền
// POST /api/transactions/withdraw/verify
// Body: { amount, otp }
router.post("/withdraw/verify", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    const { otp }  = req.body;
    if (!otp) throw new ValidationError("Validation failed", { otp: "Vui lòng nhập mã OTP" });
    res.json(await Mediator.Wallet.verifyWithdraw(req.userId, amount, otp.toString().trim()));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LỊCH SỬ
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/transactions/history
router.get("/history", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Wallet.getHistory(req.userId));
  } catch (err) { next(err); }
});

module.exports = router;