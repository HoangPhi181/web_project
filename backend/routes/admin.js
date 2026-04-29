// backend/routes/admin.js
// Admin routes - Protected by verifyAdmin middleware
// Uses CentralMediator for business logic

const express = require("express");
const { verifyAdmin } = require("../middleware/authMiddleware");
const CentralMediator = require("../mediators/CentralMediator");

const router = express.Router();

// ============================================================
// API: GET /api/admin/users - Get all users with details
// ============================================================
router.get("/users", verifyAdmin, async (req, res, next) => {
  try {
    const result = await CentralMediator.getAllUsersDetailed(req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: PUT /api/admin/settings - Update system settings
// ============================================================
router.put("/settings", verifyAdmin, async (req, res, next) => {
  try {
    const result = await CentralMediator.updateSystemSettings(req.userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
