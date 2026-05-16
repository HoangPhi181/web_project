// backend/routes/transactions.js (v3)
// Thay đổi: getHistory nhận ?type=REAL|DEMO

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { ValidationError } = require("../utils/errors");

const router = express.Router();

function parseAmount(raw) {
  const amount = parseFloat(raw);
  if (!raw || isNaN(amount) || amount <= 0)
    throw new ValidationError("Validation failed", { amount: "Số tiền phải lớn hơn 0" });
  return amount;
}

function getType(req) {
  const type = (req.query.type || "REAL").toUpperCase();
  if (!["REAL", "DEMO"].includes(type)) throw new Error("type phải là REAL hoặc DEMO");
  return type;
}

// POST /api/transactions/deposit — chỉ REAL
router.post("/deposit", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    res.json(await Mediator.Wallet.deposit(req.userId, amount));
  } catch (err) { next(err); }
});

// POST /api/transactions/deposit/:id/paid
router.post("/deposit/:id/paid", verifyToken, async (req, res, next) => {
  try {
    const transactionId = parseInt(req.params.id);
    if (!transactionId) throw new Error("Transaction ID không hợp lệ");
    res.json(await Mediator.Wallet.markAsPaid(req.userId, transactionId));
  } catch (err) { next(err); }
});

// POST /api/transactions/withdraw/request — chỉ REAL
router.post("/withdraw/request", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    res.json(await Mediator.Wallet.requestWithdraw(req.userId, amount));
  } catch (err) { next(err); }
});

// POST /api/transactions/withdraw/verify — chỉ REAL
router.post("/withdraw/verify", verifyToken, async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    const { otp } = req.body;
    if (!otp) throw new ValidationError("Validation failed", { otp: "Vui lòng nhập mã OTP" });
    res.json(await Mediator.Wallet.verifyWithdraw(req.userId, amount, otp.toString().trim()));
  } catch (err) { next(err); }
});

// GET /api/transactions/history?type=REAL|DEMO
// REAL → lịch sử nạp/rút tiền thật
// DEMO → lịch sử lệnh đã đóng của tài khoản demo
router.get("/history", verifyToken, async (req, res, next) => {
  try {
    const type = getType(req);
    res.json(await Mediator.Wallet.getHistory(req.userId, type));
  } catch (err) { next(err); }
});

module.exports = router;