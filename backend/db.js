// backend/db.js
// Kết nối MySQL — dùng Pool để hỗ trợ transaction (getConnection)

const mysql = require("mysql2");

// Pool thay vì single connection: tự động quản lý nhiều kết nối
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Kiểm tra kết nối khi khởi động
pool.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL kết nối thất bại:", err.message);
  } else {
    console.log("✅ MySQL Connected");
    conn.release();
  }
});

// Helper: query bình thường dùng async/await
pool.queryAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

module.exports = pool;