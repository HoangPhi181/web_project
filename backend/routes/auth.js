// backend/routes/auth.js
// Thin Auth Controller - Uses CentralMediator for business logic

const express = require("express");
const CentralMediator = require("../mediators/CentralMediator");
const { validateRegister, validateLogin } = require("../utils/validators");
const { ValidationError, AppError } = require("../utils/errors");

const router = express.Router();

// ============================================================
// API: POST /api/auth/register - Register new user
// ============================================================
router.post("/register", async (req, res) => {
  try {
    // 1. VALIDATE INPUT
    const { username, email, password } = validateRegister(req.body);
    const { country } = req.body; // Optional country

    // 2. CALL MEDIATOR
    const result = await CentralMediator.registerUser(username, email, password, country || null);

    // 3. RETURN RESPONSE
    res.json(result);

  } catch (error) {
    // Error handling
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        errors: error.errors || {}
      });
    }

    if (error.message && error.message.includes('already exists')) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// API: POST /api/auth/login - Login user
// ============================================================
router.post("/login", async (req, res) => {
  try {
    // 1. VALIDATE INPUT
    const { email, password } = validateLogin(req.body);

    // 2. CALL MEDIATOR
    const result = await CentralMediator.loginUser(email, password);

    // 3. RETURN RESPONSE
    res.json(result);

  } catch (error) {
    // Error handling
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        errors: error.errors || {}
      });
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

module.exports = router;