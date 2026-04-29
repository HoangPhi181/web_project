// backend/routes/admin.js
// Admin routes - Protected by verifyAdmin middleware
// Uses CentralMediator for business logic

const express = require("express");
const { verifyAdmin } = require("../middleware/authMiddleware");
const CentralMediator = require("../mediators/CentralMediator");
const { AppError } = require("../utils/errors");

const router = express.Router();

// ============================================================
// API: GET /api/admin/users - Get all users with details
// ============================================================
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const adminId = req.userId;

    // Call mediator to get all users
    const result = await CentralMediator.getAllUsersDetailed(adminId);

    res.json(result);

  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// API: PUT /api/admin/settings - Update system settings
// ============================================================
router.put("/settings", verifyAdmin, async (req, res) => {
  try {
    const adminId = req.userId;
    const settings = req.body; // Contains the settings to update

    // Call mediator to update settings
    const result = await CentralMediator.updateSystemSettings(adminId, settings);

    res.json(result);

  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Update settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
