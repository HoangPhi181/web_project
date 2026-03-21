const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {

  const { username, email, password } = req.body;

  try {

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (username,email,password) VALUES (?,?,?)";

    db.query(sql, [username, email, hashedPassword], (err, result) => {

      if (err) {
        return res.status(500).json({ message: "User already exists" });
      }

      res.json({
        message: "Register success"
      });

    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

module.exports = router;

const jwt = require("jsonwebtoken");

router.post("/login", (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {

    if (results.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = results[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id },
      "SECRET_KEY",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login success",
      token: token
    });

  });

});