// backend/routes/orders.js
// Thin Orders Controller - Uses CentralMediator for business logic
// Routes: Create Order, Get Open Orders, Close Order, Order History

const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const CentralMediator = require("../mediators/CentralMediator");
const {
  validateOrderCreate,
  validateCloseOrder,
  validatePagination
} = require("../utils/validators");

const router = express.Router();

// ============================================================
// API 1: POST /api/orders/create - Create BUY/SELL order
// ============================================================
router.post("/create", verifyToken, async (req, res, next) => {
  try {
    const validated = validateOrderCreate(req.body);
    const result = await CentralMediator.createOrder(
      req.userId,
      validated.product_id,
      validated.side,
      validated.volume,
      validated.stop_loss,
      validated.take_profit
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API 2: GET /api/orders - Get open orders for current user
// ============================================================
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const result = await CentralMediator.getOpenOrders(req.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API 3: POST /api/orders/{id}/close - Close order
// ============================================================
router.post("/:id/close", verifyToken, async (req, res, next) => {
  try {
    const validated = validateCloseOrder(req.body);
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId) || orderId <= 0) {
      throw new Error("Invalid order ID");
    }

    const result = await CentralMediator.closeOrder(req.userId, orderId, validated.close_price);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API 4: GET /api/orders/history/list - Get closed order history
// ============================================================
router.get("/history/list", verifyToken, async (req, res, next) => {
  try {
    const { limit, page, offset } = validatePagination(req.query);
    const result = await CentralMediator.getOrderHistory(req.userId, limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
