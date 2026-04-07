const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "311127",
  database: "trading_exchange",
  port: 3306
});

db.connect((err) => {

  if (err) {
    console.log("Database error:", err);
  } else {
    console.log("MySQL Connected");
  }

});

module.exports = db;