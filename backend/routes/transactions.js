// backend/routes/transactions.js
// Transaction routes - Deposits, Withdrawals, Verification
// Thin controller - Uses CentralMediator for business logic

const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const CentralMediator = require("../mediators/CentralMediator");
const { ValidationError, AppError } = require("../utils/errors");

const router = express.Router();

// ============================================================
// API: POST /api/transactions/withdraw/code - Request withdrawal code
// ============================================================
router.post("/withdraw/code", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Call mediator to send verification code
    const result = await CentralMediator.sendWithdrawCode(userId);

    res.json(result);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        errors: error.errors || {}
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Send withdraw code error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// API: POST /api/transactions/withdraw/verify - Process withdrawal with code
// ============================================================
router.post("/withdraw/verify", verifyToken, async (req, res) => {
  try {
    // 1. VALIDATE INPUT
    const { amount, verify_code } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!verify_code) {
      return res.status(400).json({ message: "Verification code required" });
    }

    const userId = req.userId;

    // 2. CALL MEDIATOR
    const result = await CentralMediator.processWithdraw(userId, amount, verify_code);

    // 3. RETURN RESPONSE
    res.json(result);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        errors: error.errors || {}
      });
    }

    // Check for insufficient balance (402 status)
    if (error.statusCode === 402) {
      return res.status(402).json({
        message: error.message,
        required_amount: error.required_margin,
        available_balance: error.available_balance
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Process withdraw error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// API: POST /api/transactions/deposit - Initiate deposit with VietQR
// ============================================================
router.post("/deposit", verifyToken, async (req, res) => {
  try {
    // 1. VALIDATE INPUT
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const userId = req.userId;

    // 2. CALL MEDIATOR
    const result = await CentralMediator.processDeposit(userId, amount);

    // 3. RETURN RESPONSE
    res.json(result);

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        errors: error.errors || {}
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Process deposit error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
