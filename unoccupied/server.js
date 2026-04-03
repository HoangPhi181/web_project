const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const marketDataRoutes = require("./routes/marketData");
const { AppError } = require("./utils/errors");
const { startScheduler } = require("./scheduler");
const { startWebSocketServer, startPriceBroadcast } = require("./websocket");
const { setWebSocketBroadcasters, broadcastPriceUpdate, broadcastCandleUpdate } = require("./utils/binanceAPI");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/market", marketDataRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Validation errors
  if (err.statusCode === 400) {
    return res.status(400).json({
      message: err.message,
      errors: err.errors || {}
    });
  }

  // Insufficient balance
  if (err.statusCode === 402) {
    return res.status(402).json({
      message: err.message,
      required_margin: err.required_margin,
      available_balance: err.available_balance
    });
  }

  // Unauthorized
  if (err.statusCode === 401) {
    return res.status(401).json({ message: err.message });
  }

  // Not found
  if (err.statusCode === 404) {
    return res.status(404).json({ message: err.message });
  }

  // Conflict
  if (err.statusCode === 409) {
    return res.status(409).json({ message: err.message });
  }

  // Default server error
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - ${new Date().toISOString()}`);

  // Start WebSocket server
  startWebSocketServer(server);

  // Set WebSocket broadcasters for real-time updates
  setWebSocketBroadcasters(broadcastPriceUpdate, broadcastCandleUpdate);

  // Start price broadcast every 2 seconds
  startPriceBroadcast();

  // Start OHLC data scheduler
  startScheduler();
});