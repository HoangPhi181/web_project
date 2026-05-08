// backend/routes/transactions.js
// Nạp tiền (QR), Rút tiền, Lịch sử

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { ValidationError } = require("../utils/errors");

const router = express.Router();

// ── Helper validate số tiền ──────────────────────────────────────────────────
function parseAmount(raw) {
  const amount = parseFloat(raw);
  if (!raw || isNaN(amount) || amount <= 0)
    throw new ValidationError("Validation failed", { amount: "Số tiền phải lớn hơn 0" });
  return amount;
}

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 1: POST /api/transactions/deposit
// User nhập số tiền → nhận link QR + mã tham chiếu
//
// Request:  { amount: 500000 }
// Response: { qr_url, reference_code, transaction_id, ... }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/deposit", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    const result = await Mediator.Wallet.deposit(req.userId, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BƯỚC 2: POST /api/transactions/deposit/:id/paid
// User bấm "Đã thanh toán" → backend ghi nhận, chờ admin
//
// Request:  (không cần body)
// Response: { message: "Đã ghi nhận, chờ admin xác nhận" }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/deposit/:id/paid", verifyToken, async (req, res, next) => {
  try {
    const transactionId = parseInt(req.params.id);
    if (!transactionId) throw new Error("Transaction ID không hợp lệ");
    const result = await Mediator.Wallet.markAsPaid(req.userId, transactionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/transactions/withdraw
// User rút tiền — trừ ngay, không cần admin duyệt
//
// Request:  { amount: 100000 }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/withdraw", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    const result = await Mediator.Wallet.withdraw(req.userId, amount);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/transactions/history
// Lịch sử nạp/rút của user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/history", verifyToken, async (req, res, next) => {
  try {
    const result = await Mediator.Wallet.getHistory(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;