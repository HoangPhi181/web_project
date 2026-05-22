// backend/middleware/authMiddleware.js
// Phân quyền 3 cấp: user < admin < superadmin

const jwt = require("jsonwebtoken");

// ── Helper dùng chung ────────────────────────────────────────────────────────
// Tách token từ header, verify, gắn vào req rồi gọi callback
function extractAndVerify(req, res, callback) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ message: "Unauthorized" });

    req.userId   = decoded.userId;
    req.userRole = decoded.role;
    callback(decoded);
  });
}

// ── Middleware 1: Đã đăng nhập (user, admin, superadmin) ─────────────────────
function verifyToken(req, res, next) {
  extractAndVerify(req, res, () => next());
}

// ── Middleware 2: Phải là admin hoặc superadmin ───────────────────────────────
function verifyAdmin(req, res, next) {
  extractAndVerify(req, res, (decoded) => {
    if (!["admin", "superadmin"].includes(decoded.role))
      return res.status(403).json({ message: "Yêu cầu quyền Admin" });
    next();
  });
}

// ── Middleware 3: Chỉ superadmin ─────────────────────────────────────────────
function verifySuperAdmin(req, res, next) {
  extractAndVerify(req, res, (decoded) => {
    if (decoded.role !== "superadmin")
      return res.status(403).json({ message: "Yêu cầu quyền Super Admin" });
    next();
  });
}

module.exports = verifyToken;
module.exports.verifyAdmin      = verifyAdmin;
module.exports.verifySuperAdmin = verifySuperAdmin;