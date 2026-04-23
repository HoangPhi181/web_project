const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// 1. Đăng ký
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";

    db.query(sql, [username, email, hashedPassword], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "User already exists or Database error" });
      }

      const userId = result.insertId;
      const createAccountSql = "INSERT INTO accounts (user_id, balance, used_margin, leverage) VALUES (?, ?, ?, ?)";
      
      db.query(createAccountSql, [userId, 10000, 0, 100], (accountErr) => {
        if (accountErr) console.log("Error creating account:", accountErr);
        
        res.json({
          message: "Register success",
          userId: userId
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Đăng nhập
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(401).json({ message: "User not found" });

      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) return res.status(401).json({ message: "Wrong password" });

      const token = jwt.sign(
        { id: user.user_id },
        "SECRET_KEY",
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login success",
        token: token
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 3. Lấy thông tin cá nhân
router.get("/profile", verifyToken, (req, res) => {
    // Liệt kê rõ avatar ở đây
    const sql = "SELECT user_id, avatar, username, email, created_at FROM users WHERE user_id = ?";
    
    db.query(sql, [req.userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi DB" });
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });
        
        // Trả về dữ liệu. Kết quả sẽ có avatar nằm trong object này.
        res.json(results[0]); 
    });
});

// 4. Cập nhật thông tin
router.put("/update-profile", verifyToken, (req, res) => {
    const { avatar, username, email } = req.body;
    
    // Thứ tự trong SET không quan trọng, miễn là tên cột đúng
    const sql = "UPDATE users SET avatar = ?, username = ?, email = ? WHERE user_id = ?";
    
    db.query(sql, [avatar, username, email, req.userId], (err, result) => {
        if (err) {
            console.error("LỖI SQL:", err.message);
            return res.status(500).json({ message: "Cập nhật thất bại" });
        }
        res.json({ message: "Cập nhật thành công" });
    });
});


// Hàm tạo ID ngẫu nhiên 6 ký tự (VD: 4A2B91)
const generateAccountId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

router.post("/open-account", verifyToken, (req, res) => {
    const { leverage, typeAccount } = req.body;

    const accountId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 👇 QUAN TRỌNG: lấy userId từ token
    const userId = req.userId;

    console.log("USER ID:", userId);

    // ❌ check thiếu typeAccount
    if (!typeAccount) {
        return res.status(400).json({ message: "Thiếu typeAccount" });
    }

    const sql = `
        INSERT INTO accounts 
        (account_id, user_id, balance, leverage, typeAccount) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [accountId, userId, 10000, leverage || 100, typeAccount],
        (err, result) => {
            if (err) {
                console.error("Lỗi MySQL:", err.message);
                return res.status(500).json({
                    message: "Lỗi DB",
                    error: err.message,
                });
            }

            res.json({
                message: "Mở tài khoản thành công!",
                account_id: accountId,
            });
        }
    );
});

router.get("/account", verifyToken, (req, res) => {
    const userId = req.userId;

    console.log("GET USER ID:", userId);

    const sql = `
        SELECT account_id, balance, used_margin, leverage, typeAccount 
        FROM accounts 
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Lỗi lấy dữ liệu" });
        }

        console.log("DATA:", results);

        res.json(results);
    });
});

// LUÔN LUÔN ĐỂ DÒNG NÀY Ở CUỐI CÙNG
module.exports = router;