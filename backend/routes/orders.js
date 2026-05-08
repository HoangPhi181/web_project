// backend/routes/orders.js

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { validateOrderCreate, validateCloseOrder, validatePagination } = require("../utils/validators");

const router = express.Router();

// POST /api/orders/create — Tạo lệnh BUY/SELL
router.post("/create", verifyToken, async (req, res, next) => {
  try {
    await Mediator.Trade.checkNotBlocked(req.userId); // kiểm tra tài khoản không bị khóa
    const v = validateOrderCreate(req.body);
    const result = await Mediator.Trade.createOrder(
      req.userId, v.product_id, v.side, v.volume, v.stop_loss, v.take_profit
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// GET /api/orders/opening — Danh sách lệnh đang mở + floating P&L
router.get("/opening", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Trade.getOpenOrders(req.userId));
  } catch (err) { next(err); }
});

// GET /api/orders/balance — Số dư + equity + floating P&L
router.get("/balance", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Trade.getBalance(req.userId));
  } catch (err) { next(err); }
});

// POST /api/orders/:id/close — Đóng lệnh
router.post("/:id/close", verifyToken, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!orderId || orderId <= 0) throw new Error("Order ID không hợp lệ");
    const { close_price } = validateCloseOrder(req.body);
    res.json(await Mediator.Trade.closeOrder(req.userId, orderId, close_price));
  } catch (err) { next(err); }
});

// GET /api/orders/history/list — Lịch sử lệnh đã đóng (có phân trang)
router.get("/history/list", verifyToken, async (req, res, next) => {
  try {
    const { limit, offset } = validatePagination(req.query);
    res.json(await Mediator.Trade.getOrderHistory(req.userId, limit, offset));
  } catch (err) { next(err); }
});

module.exports = router;