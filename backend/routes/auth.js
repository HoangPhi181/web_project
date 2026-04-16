const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { validateRegister } = require("../utils/validators");

const router = express.Router();

router.post("/register", async (req, res) => {

  try {
    // Validate input
    const { username, email, password } = validateRegister(req.body);
    const { country } = req.body; // Optional country

    // Check for existing user
    const checkUserSql = "SELECT user_id FROM users WHERE username = ? OR email = ?";
    db.query(checkUserSql, [username, email], async (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({ message: "Database error" });
      }

      if (checkResults.length > 0) {
        return res.status(409).json({ message: "Username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const sql = "INSERT INTO users (username,email,country,password_hash) VALUES (?,?,?,?)";

      db.query(sql, [username, email, country || null, hashedPassword], (err, result) => {

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
    });

  } catch (error) {
    if (error instanceof require("../utils/errors").ValidationError) {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }

});

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
        process.env.JWT_SECRET,
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

module.exports = router;