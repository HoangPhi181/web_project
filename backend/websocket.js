// backend/websocket.js
const WebSocket = require('ws');
const db = require('./db'); // Đảm bảo đường dẫn tới file db của bạn đúng

let wss = null;
const clients = new Set();

// Khởi tạo Server WebSocket
function startWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 [WS] Client mới đã kết nối');
    clients.add(ws);

    // Gửi tin nhắn chào mừng
    ws.send(JSON.stringify({ type: 'connected', message: 'Ready' }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log('🔌 [WS] Client đã ngắt kết nối');
    });
  });
}

// Hàm phát giá đơn lẻ (dùng cho bảng giá Dashboard)
function broadcastPriceUpdate(symbol, price, timestamp) {
  const message = JSON.stringify({
    type: 'price_update',
    symbol: symbol,
    price: parseFloat(price),
    timestamp: timestamp
  });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

// Hàm phát nến (dùng cho biểu đồ nhảy realtime)
function broadcastCandleUpdate(symbol, candle) {
  const message = JSON.stringify({
    type: 'candle_update',
    symbol: symbol,
    data: { 
      timestamp: candle.timestamp,
      open_price: parseFloat(candle.open_price),
      high_price: parseFloat(candle.high_price),
      low_price: parseFloat(candle.low_price),
      close_price: parseFloat(candle.close_price)
    }
  });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

// HÀM BỊ THIẾU CỦA BẠN ĐÂY: Phát giá định kỳ từ Database
function startPriceBroadcast() {
  setInterval(async () => {
    try {
      // Lấy giá mới nhất từ bảng products để gửi cho các widget giá
      const [rows] = await db.promise().query(
        'SELECT symbol, current_price FROM products WHERE is_active = TRUE'
      );
      
      rows.forEach(row => {
        broadcastPriceUpdate(row.symbol, row.current_price, new Date().toISOString());
      });
    } catch (error) {
      console.error('❌ Lỗi định kỳ phát giá:', error.message);
    }
  }, 2000); // 2 giây phát một lần
}

// QUAN TRỌNG: Phải export đầy đủ 4 hàm này
module.exports = {
  startWebSocketServer,
  broadcastPriceUpdate,
  broadcastCandleUpdate,
  startPriceBroadcast // <-- Phải có dòng này thì server.js mới không bị lỗi
};