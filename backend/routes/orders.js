// backend/routes/orders.js 

const express     = require("express");
const verifyToken = require("../middleware/authMiddleware");
const Mediator    = require("../mediators/CentralMediator");
const { validateOrderCreate, validateCloseOrder, validatePagination } = require("../utils/validators");

const router = express.Router();

// Helper: lấy account type từ query, mặc định DEMO
function getType(req) {
  const type = (req.query.type || "DEMO").toUpperCase();
  if (!["REAL", "DEMO"].includes(type)) throw new Error("type phải là REAL hoặc DEMO");
  return type;
}

// POST /api/orders/create?type=REAL|DEMO
router.post("/create", verifyToken, async (req, res, next) => {
  try {
    await Mediator.Trade.checkNotBlocked(req.userId);
    const type = getType(req);

    // Lấy giá hiện tại của sản phẩm để validate SL/TP theo side
    const db = require("../db");
    const [[product]] = await db.promise().query(
      "SELECT current_price FROM products WHERE product_id=? AND is_active=TRUE",
      [req.body.product_id]
    );
    const currentPrice = product ? parseFloat(product.current_price) : null;

    const v = validateOrderCreate(req.body, currentPrice);
    const result = await Mediator.Trade.createOrder(
      req.userId, v.product_id, v.side, v.volume, v.stop_loss, v.take_profit, type
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// GET /api/orders/opening?type=REAL|DEMO
router.get("/opening", verifyToken, async (req, res, next) => {
  try {
    const type = getType(req);
    res.json(await Mediator.Trade.getOpenOrders(req.userId, type));
  } catch (err) { next(err); }
});

// GET /api/orders/balance?type=REAL|DEMO
// Lấy 1 ví theo type, hoặc nếu type=ALL thì lấy cả 2 ví
router.get("/balance", verifyToken, async (req, res, next) => {
  try {
    const typeRaw = (req.query.type || "ALL").toUpperCase();
    if (typeRaw === "ALL") {
      // Trả về cả 2 ví REAL + DEMO cùng lúc → frontend hiển thị dashboard
      res.json(await Mediator.Trade.getBothBalances(req.userId));
    } else {
      const type = getType(req);
      res.json(await Mediator.Trade.getBalance(req.userId, type));
    }
  } catch (err) { next(err); }
});

// POST /api/orders/:id/close
// Không cần truyền type — tự xác định qua account_id của lệnh
router.post("/:id/close", verifyToken, async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (!orderId || orderId <= 0) throw new Error("Order ID không hợp lệ");
    const { close_price } = validateCloseOrder(req.body);
    res.json(await Mediator.Trade.closeOrder(req.userId, orderId, close_price));
  } catch (err) { next(err); }
});

// GET /api/orders/history/list?type=REAL|DEMO
router.get("/history/list", verifyToken, async (req, res, next) => {
  try {
    const type           = getType(req);
    const { limit, offset } = validatePagination(req.query);
    res.json(await Mediator.Trade.getOrderHistory(req.userId, limit, offset, type));
  } catch (err) { next(err); }
});

// POST /api/orders/demo/reset
// Reset tài khoản DEMO về 10000 — chỉ DEMO, không có REAL
router.post("/demo/reset", verifyToken, async (req, res, next) => {
  try {
    res.json(await Mediator.Trade.resetDemo(req.userId));
  } catch (err) { next(err); }
});

module.exports = router;