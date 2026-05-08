// backend/server.js
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const bodyParser = require("body-parser");

// Routes
const authRoutes        = require("./routes/auth");
const ordersRoutes      = require("./routes/orders");
const marketDataRoutes  = require("./routes/marketData");
const adminRoutes       = require("./routes/admin");
const transactionRoutes = require("./routes/transactions");

// Utils
const { AppError }       = require("./utils/errors");
const { startScheduler } = require("./scheduler");

// FIX: broadcast functions lấy từ websocket.js (không phải binanceAPI.js)
const {
  startWebSocketServer,
  startPriceBroadcast,
  broadcastPriceUpdate,   // ✅ đúng nguồn
  broadcastCandleUpdate,  // ✅ đúng nguồn
} = require("./websocket");

const { setWebSocketBroadcasters } = require("./utils/binanceAPI");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/orders",       ordersRoutes);
app.use("/api/market",       marketDataRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/transactions", transactionRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running", timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Lỗi validation (400)
  if (err.statusCode === 400) {
    return res.status(400).json({ message: err.message, errors: err.errors || {} });
  }
  // Số dư không đủ (402)
  if (err.statusCode === 402) {
    return res.status(402).json({
      message:           err.message,
      required_margin:   err.required_margin,
      available_balance: err.available_balance,
    });
  }
  // Các lỗi có statusCode khác
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  // Lỗi business logic thông thường (ném bằng new Error(...))
  if (err.isOperational || err instanceof Error) {
    return res.status(400).json({ message: err.message });
  }
  // Lỗi không mong muốn
  res.status(500).json({
    message: "Internal server error",
    error:   process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Khởi động WebSocket
  startWebSocketServer(server);

  // FIX: truyền đúng hàm broadcast từ websocket.js vào binanceAPI
  setWebSocketBroadcasters(broadcastPriceUpdate, broadcastCandleUpdate);

  // Bắt đầu broadcast giá mỗi 2 giây
  startPriceBroadcast();

  // Bắt đầu scheduler sync giá từ Binance
  startScheduler();
});