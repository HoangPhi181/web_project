// backend/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");

// Import các Routes
const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const marketDataRoutes = require("./routes/marketData");

// Import Logic từ Scheduler và WebSocket
const { startScheduler } = require("./scheduler");
const { 
  startWebSocketServer, 
  startPriceBroadcast, 
  broadcastPriceUpdate, 
  broadcastCandleUpdate 
} = require("./websocket");

// Import hàm để "nối dây" dữ liệu vào Binance API
const { setWebSocketBroadcasters } = require("./utils/binanceAPI");

const app = express();

// Middleware
app.use(cors());
// Cấu hình Express xử lý dữ liệu lớn
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Cấu hình các API Routes

app.use("/api/auth", authRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/market", marketDataRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "success", 
    message: "Server is running", 
    timestamp: new Date().toISOString() 
  });
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint không tồn tại" });
});

// Global error handler (Xử lý lỗi tập trung)
app.use((err, req, res, next) => {
  console.error("Critical Error:", err);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Khởi tạo HTTP Server để bọc Express app (Bắt buộc để chạy WebSocket)
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📅 Bắt đầu lúc: ${new Date().toLocaleString()}`);
  console.log(`================================================`);

  // 1. Kích hoạt WebSocket Server
  startWebSocketServer(server);

  // 2. KẾT NỐI QUAN TRỌNG: 
  // Lấy các hàm gửi tin nhắn từ websocket.js và đưa vào binanceAPI.js
  // Nếu thiếu dòng này, nến trên biểu đồ sẽ đứng im dù Terminal vẫn báo update.
  setWebSocketBroadcasters(broadcastPriceUpdate, broadcastCandleUpdate);

  // 3. Chạy phát giá định kỳ 2 giây/lần cho các bảng giá/dashboard
  startPriceBroadcast();

  // 4. Chạy Scheduler để tự động Fetch nến từ Binance theo chu kỳ (Sync Data)
  startScheduler();
});

// Xử lý khi server bị tắt đột ngột
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});