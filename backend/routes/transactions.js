// backend/routes/transactions.js
// Transaction routes - Deposits, Withdrawals, Verification
// Thin controller - Uses CentralMediator for business logic

const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const CentralMediator = require("../mediators/CentralMediator");
const { ValidationError } = require("../utils/errors");

const router = express.Router();

// ============================================================
// API: POST /api/transactions/withdraw/code - Request withdrawal code
// ============================================================
router.post("/withdraw/code", verifyToken, async (req, res, next) => {
  try {
    const result = await CentralMediator.sendWithdrawCode(req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: POST /api/transactions/withdraw/verify - Process withdrawal with code
// ============================================================
router.post("/withdraw/verify", verifyToken, async (req, res, next) => {
  try {
    const { amount, verify_code } = req.body;
    const errors = {};

    if (amount === undefined || amount === null || isNaN(amount) || parseFloat(amount) <= 0) {
      errors.amount = 'Amount must be a valid number greater than 0';
    }

    if (!verify_code) {
      errors.verify_code = 'Verification code is required';
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    const result = await CentralMediator.processWithdraw(req.userId, amount, verify_code);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: POST /api/transactions/deposit - Initiate deposit with VietQR
// ============================================================
router.post("/deposit", verifyToken, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const errors = {};

    if (amount === undefined || amount === null || isNaN(amount) || parseFloat(amount) <= 0) {
      errors.amount = 'Amount must be a valid number greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    const result = await CentralMediator.processDeposit(req.userId, amount);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
