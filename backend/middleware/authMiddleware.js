const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {

  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

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

  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (decoded.role !== 'admin') {
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