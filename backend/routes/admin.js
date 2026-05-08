// backend/routes/admin.js
// Quản lý user + Xét duyệt nạp tiền (chỉ admin)

const express        = require("express");
const { verifyAdmin } = require("../middleware/authMiddleware");
const Mediator       = require("../mediators/CentralMediator");

const router = express.Router();

// ── Quản lý User ─────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get("/users", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.getAllUsers());
  } catch (err) { next(err); }
});

// GET /api/admin/users/search?phone=...
router.get("/users/search", verifyAdmin, async (req, res, next) => {
  try {
    if (!req.query.phone) return res.status(400).json({ message: "Thiếu tham số phone" });
    res.json(await Mediator.Admin.searchByPhone(req.query.phone));
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/block
router.put("/users/:id/block", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.blockUser(req.userId, parseInt(req.params.id)));
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/unblock
router.put("/users/:id/unblock", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.unblockUser(req.userId, parseInt(req.params.id)));
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.updateRole(req.userId, parseInt(req.params.id), req.body.role));
  } catch (err) { next(err); }
});

// ── Xét duyệt Nạp tiền ───────────────────────────────────────────────────────
//
// Luồng:
//   1. User tạo QR  → POST /api/transactions/deposit
//   2. User bấm "Đã thanh toán" → POST /api/transactions/deposit/:id/paid
//   3. Admin xem danh sách → GET  /api/admin/deposits
//   4. Admin xác nhận     → PUT  /api/admin/deposits/:id/confirm  → tiền vào tài khoản
//      hoặc từ chối       → PUT  /api/admin/deposits/:id/reject

// GET /api/admin/deposits  — Danh sách yêu cầu đang chờ
router.get("/deposits", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.getPendingDeposits());
  } catch (err) { next(err); }
});

// PUT /api/admin/deposits/:id/confirm  — Xác nhận → cộng tiền
router.put("/deposits/:id/confirm", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Wallet.confirmDeposit(req.userId, parseInt(req.params.id)));
  } catch (err) { next(err); }
});

// PUT /api/admin/deposits/:id/reject  — Từ chối
router.put("/deposits/:id/reject", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Wallet.rejectDeposit(req.userId, parseInt(req.params.id)));
  } catch (err) { next(err); }
});

module.exports = router;