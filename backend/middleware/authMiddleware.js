const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // Lấy chuỗi từ header
  const authHeader = req.headers["authorization"];
  
  // Kiểm tra nếu không có header hoặc không bắt đầu bằng Bearer
  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  // Tách lấy phần Token thực sự (cắt bỏ chữ 'Bearer ')
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token format invalid" });
  }

  jwt.verify(token, "SECRET_KEY", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized - Token invalid or expired" });
    }

    // Gán ID người dùng vào request để dùng ở các hàm sau
    req.userId = decoded.id;
    next();
  });
}

module.exports = verifyToken;