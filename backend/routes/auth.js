const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {

  const { username, email, password } = req.body;

  try {

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (username,email,password_hash) VALUES (?,?,?)";

    db.query(sql, [username, email, hashedPassword], (err, result) => {

      if (err) {
        return res.status(500).json({ message: "User already exists" });
      }

      // Auto-create account cho user mới
      const userId = result.insertId;
      const createAccountSql = "INSERT INTO accounts (user_id, balance, used_margin, leverage) VALUES (?, ?, ?, ?)";
      
      db.query(createAccountSql, [userId, 10000, 0, 100], (accountErr) => {
        if (accountErr) {
          console.log("Error creating account:", accountErr);
          // Vẫn return success vì user đã được tạo
        }
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

module.exports = router;

router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {
    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], async (err, results) => {

      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = results[0];

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ message: "Wrong password" });
      }

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