# Real-time Price Updates & Candle Data System

## 🎯 Tổng quan

Hệ thống trading platform hỗ trợ cập nhật giá real-time từ Binance và lưu trữ dữ liệu nến OHLC liên tục.

## ⚡ Cơ chế hoạt động

### 1. **Data Flow Architecture**
```
Binance API → Backend Scheduler → Database → WebSocket → Frontend Charts
     ↓             ↓                    ↓           ↓            ↓
   Raw OHLC     Sync mỗi 10s         Candles     Real-time    Live Charts
   Data         (configurable)       Table       Updates      Updates
```

### 2. **Sync Frequency**
- **OHLC Candles**: Sync mỗi 10 giây từ Binance
- **Current Price**: Cập nhật mỗi 10 giây
- **WebSocket Broadcast**: Push updates mỗi 2 giây
- **Database Storage**: Lưu trữ liên tục tất cả dữ liệu lịch sử

### 3. **Real-time Updates**

#### **WebSocket Messages:**
```json
// Price Update
{
  "type": "price_update",
  "symbol": "BTC-USD",
  "price": 68814.30,
  "timestamp": "2026-03-23T17:30:15.000Z"
}

// Candle Update
{
  "type": "candle_update",
  "symbol": "BTC-USD",
  "candle": {
    "timestamp": "2026-03-23T17:30:00.000Z",
    "open_price": 68800.00,
    "high_price": 68850.00,
    "low_price": 68790.00,
    "close_price": 68814.30,
    "volume": 123.45
  }
}
```

## 🚀 Cách sử dụng

### **1. Start Server**
```bash
cd backend
node server.js
```

### **2. Test WebSocket Connection**
```bash
node test_websocket.js
```

### **3. API Endpoints**

#### **REST APIs:**
- `GET /api/market/products` - Danh sách sản phẩm với giá hiện tại
- `GET /api/market/candles/:symbol?timeframe=1m&limit=100` - Lịch sử nến
- `GET /api/market/current-price/:symbol` - Giá hiện tại real-time

#### **WebSocket:**
- URL: `ws://localhost:5000`
- Auto-connect và nhận updates real-time

### **4. Frontend Integration**

#### **WebSocket Client (React):**
```javascript
import { useEffect, useState } from 'react';

function PriceDisplay({ symbol }) {
  const [price, setPrice] = useState(0);
  const [candles, setCandles] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'price_update' && data.symbol === symbol) {
        setPrice(data.price);
      }

      if (data.type === 'candle_update' && data.symbol === symbol) {
        setCandles(prev => [...prev.slice(-99), data.candle]); // Keep last 100
      }
    };

    return () => ws.close();
  }, [symbol]);

  return (
    <div>
      <h2>{symbol}: ${price.toFixed(2)}</h2>
      {/* Render candle chart with candles data */}
    </div>
  );
}
```

## 📊 Database Schema

### **Candles Table:**
```sql
CREATE TABLE candles (
  candle_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  timeframe VARCHAR(10) NOT NULL, -- '1m', '5m', '1h', etc.
  timestamp TIMESTAMP NOT NULL,
  open_price DECIMAL(18,8) NOT NULL,
  high_price DECIMAL(18,8) NOT NULL,
  low_price DECIMAL(18,8) NOT NULL,
  close_price DECIMAL(18,8) NOT NULL,
  volume DECIMAL(18,8) NOT NULL,
  UNIQUE KEY unique_candle (product_id, timeframe, timestamp)
);
```

### **Products Table:**
```sql
CREATE TABLE products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  category ENUM('crypto','forex','gold') NOT NULL,
  current_price DECIMAL(18,8) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## ⚙️ Configuration

### **Sync Intervals (trong scheduler.js):**
```javascript
const SYNC_INTERVAL_SECONDS = 10; // Sync OHLC mỗi 10 giây
const BROADCAST_INTERVAL_MS = 2000; // Broadcast WebSocket mỗi 2 giây
```

### **Supported Symbols:**
```javascript
const SYMBOL_MAPPING = {
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'XRP-USD': 'XRPUSDT'
};
```

## 🔄 Trade-offs & Performance

### **Real-time vs Performance:**
- **Sync mỗi 10s**: Cân bằng giữa real-time và API rate limits
- **WebSocket broadcast mỗi 2s**: Đảm bảo UI updates mượt mà
- **Database storage**: Lưu trữ lịch sử đầy đủ cho analysis

### **Scalability:**
- **Connection pooling**: MySQL connection pool
- **WebSocket optimization**: Chỉ broadcast cho clients subscribed
- **Rate limiting**: Built-in Binance API rate limiting

### **Reliability:**
- **Error handling**: Continue sync even if một symbol fails
- **Connection recovery**: Auto-reconnect WebSocket
- **Data validation**: Validate OHLC data trước khi lưu

## 🎯 Kết luận

Hệ thống cung cấp:
- ✅ **Real-time price updates** qua WebSocket
- ✅ **Continuous candle data storage** từ Binance
- ✅ **Scalable architecture** cho high-frequency trading
- ✅ **REST APIs** cho historical data
- ✅ **WebSocket push** cho live updates

**Cơ chế: Binance → Database → WebSocket Broadcast → Frontend Charts** 🎉