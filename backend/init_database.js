const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Tạo kết nối mà không cần database (để tạo database)
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err.message);
    console.log("\n💡 Kiểm tra:");
    console.log("   1. MySQL server đang chạy không?");
    console.log("   2. Username/password đúng không? (hiện tại: root/123456)");
    process.exit(1);
  }

  console.log("✅ Đã kết nối MySQL");

  // Đọc file schema.sql
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  // Tách các câu lệnh SQL (phân tách bằng ;)
  const queries = schema
    .split(";")
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  let completed = 0;

  // Chạy từng câu lệnh
  queries.forEach((query, index) => {
    connection.query(query, (err, results) => {
      if (err) {
        console.error(`❌ Lỗi ở câu lệnh ${index + 1}:`, err.message);
      } else {
        console.log(`✅ Câu lệnh ${index + 1} thành công`);
      }

      completed++;
      if (completed === queries.length) {
        console.log("\n🎉 Database đã được tạo thành công!");
        connection.end();
        process.exit(0);
      }
    });
  });
});