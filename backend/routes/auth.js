// backend/routes/auth.js
// Route Auth — Mỏng: chỉ nhận request, gọi Mediator, trả response

const express    = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator   = require("../mediators/CentralMediator");
const { validateRegister, validateLogin } = require("../utils/validators");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = validateRegister(req.body);
    const result = await Mediator.Auth.register(username, email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    const result = await Mediator.Auth.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout  (cần đăng nhập)
router.post("/logout", verifyToken, async (req, res, next) => {
  try {
    const result = await Mediator.Auth.logout(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/profile  (cần đăng nhập)
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    const result = await Mediator.Auth.getProfile(req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile  (cần đăng nhập)
router.put("/profile", verifyToken, async (req, res, next) => {
  try {
    const result = await Mediator.Auth.updateProfile(req.userId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;