// backend/routes/auth.js
// Thin Auth Controller - Uses CentralMediator for business logic

const express = require("express");
const CentralMediator = require("../mediators/CentralMediator");
const { validateRegister, validateLogin } = require("../utils/validators");

const router = express.Router();

// ============================================================
// API: POST /api/auth/register - Register new user
// ============================================================
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = validateRegister(req.body);
    const { country } = req.body;

    const result = await CentralMediator.registerUser(username, email, password, country || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: POST /api/auth/login - Login user
// ============================================================
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    const result = await CentralMediator.loginUser(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;