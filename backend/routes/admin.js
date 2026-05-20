// backend/routes/admin.js (v3)
// Cập nhật: updateRole truyền thêm callerRole để kiểm tra phân quyền

const express            = require("express");
const { verifyAdmin }    = require("../middleware/authMiddleware");
const Mediator           = require("../mediators/CentralMediator");

const router = express.Router();

// GET /api/admin/users
router.get("/users", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.getAllUsers());
  } catch (err) { next(err); }
});

// GET /api/admin/users/search?phone=...
router.get("/users/search", verifyAdmin, async (req, res, next) => {
  try {
    if (!req.query.phone)
      return res.status(400).json({ message: "Thiếu tham số phone" });
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
// Truyền thêm req.userRole để adminMediator kiểm tra phân quyền
router.put("/users/:id/role", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.updateRole(
      req.userId,              // id người gọi
      req.userRole,            // role người gọi (admin | superadmin)
      parseInt(req.params.id), // id người được đổi
      req.body.role            // role mới muốn đặt
    ));
  } catch (err) { next(err); }
});

// GET /api/admin/deposits
router.get("/deposits", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Admin.getPendingDeposits());
  } catch (err) { next(err); }
});

// PUT /api/admin/deposits/:id/confirm
router.put("/deposits/:id/confirm", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Wallet.confirmDeposit(parseInt(req.params.id)));
  } catch (err) { next(err); }
});

// PUT /api/admin/deposits/:id/reject
router.put("/deposits/:id/reject", verifyAdmin, async (req, res, next) => {
  try {
    res.json(await Mediator.Wallet.rejectDeposit(parseInt(req.params.id)));
  } catch (err) { next(err); }
});

module.exports = router;