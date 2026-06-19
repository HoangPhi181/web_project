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

const {
  startWebSocketServer,
  startPriceBroadcast,
  broadcastPriceUpdate,
  broadcastCandleUpdate,
} = require("./websocket");

const { setWebSocketBroadcasters, startBinancePriceStream } = require("./utils/binanceAPI");

const app = express();

app.use(cors());

app.use(bodyParser.json({
  limit: "50mb"
}));

app.use(bodyParser.urlencoded({
  limit: "50mb",
  extended: true
}));

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

// ROOT ROUTE
app.get("/", (req, res) => {
  res.send("Backend trading project is running");
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  if (err.statusCode === 400) {
    return res.status(400).json({ message: err.message, errors: err.errors || {} });
  }
  if (err.statusCode === 402) {
    return res.status(402).json({
      message:           err.message,
      required_margin:   err.required_margin,
      available_balance: err.available_balance,
    });
  }
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  if (err.isOperational || err instanceof Error) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({
    message: "Internal server error",
    error:   process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  startWebSocketServer(server);
  setWebSocketBroadcasters(broadcastPriceUpdate, broadcastCandleUpdate);
  startBinancePriceStream(); // ← Binance WS stream (thay REST, tránh 418)
  startPriceBroadcast();
  startScheduler();
});