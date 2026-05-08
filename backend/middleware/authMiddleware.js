  const jwt = require("jsonwebtoken");

  function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Tách Bearer token
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.username = decoded.username;

      next();
    });
  }

  function verifyAdmin(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.username = decoded.username;

      next();
    });
  }

  module.exports = verifyToken;
  module.exports.verifyAdmin = verifyAdmin;