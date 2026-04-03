# 📊 OHLC Data & Price Management
## Giải thích Open Price vs Current Price

---

## ❓ **Câu hỏi: Open Price có bằng Current Price không?**

### **Trả lời: KHÔNG, chúng là 2 khái niệm khác nhau hoàn toàn!**

#### **🔹 Open Price (Giá Mở Lệnh)**
- **Định nghĩa:** Giá của sản phẩm tại thời điểm user tạo lệnh BUY/SELL
- **Lưu trong:** Bảng `orders.open_price`
- **Ví dụ:** User tạo lệnh BUY BTC lúc giá $45,000 → `open_price = 45000`
- **Không thay đổi:** Giá này cố định, không bao giờ thay đổi sau khi lệnh được tạo

#### **🔹 Current Price (Giá Hiện Tại)**
- **Định nghĩa:** Giá real-time của sản phẩm từ sàn giao dịch (Binance)
- **Lưu trong:** Bảng `products.current_price`
- **Ví dụ:** BTC hiện tại đang ở $45,123 → `current_price = 45123`
- **Thay đổi liên tục:** Được update mỗi phút từ Binance API

---

## 📈 **Cách Hoạt Động Của OHLC Data**

### **OHLC = Open, High, Low, Close**
```
O: Open   - Giá mở cửa (đầu khoảng thời gian)
H: High   - Giá cao nhất trong khoảng thời gian
L: Low    - Giá thấp nhất trong khoảng thời gian
C: Close  - Giá đóng cửa (cuối khoảng thời gian)
```

### **Ví dụ với BTC/USDT trên Binance (1 phút timeframe):**
```
Timestamp: 2026-03-22 10:30:00
Open:  45,000.00  ← Giá lúc bắt đầu phút
High:  45,150.00  ← Giá cao nhất trong phút
Low:   44,950.00  ← Giá thấp nhất trong phút
Close: 45,123.00  ← Giá lúc kết thúc phút (current_price)
```

---

## 🔄 **Luồng Hoạt Động**

### **1. Fetch OHLC từ Binance API**
```javascript
// Mỗi phút, fetch candle mới nhất
const ohlcData = await fetchOHLCData('BTC-USD', '1m', 1);
// Result: [{ timestamp, open_price: 45000, high_price: 45150, low_price: 44950, close_price: 45123 }]
```

### **2. Update Candles Table**
```sql
INSERT INTO candles (product_id, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
VALUES (1, '1m', '2026-03-22 10:30:00', 45000, 45150, 44950, 45123, 123.45);
```

### **3. Update Current Price**
```sql
UPDATE products SET current_price = 45123 WHERE symbol = 'BTC-USD';
```

### **4. Tạo Lệnh Sử Dụng Open Price**
```javascript
// Khi user tạo lệnh BUY
const openPrice = currentPrice; // 45,123
// Lưu vào orders.open_price = 45123
```

---

## 🎯 **Tại Sao Cần OHLC Data?**

### **1. Charts & TradingView Integration**
- Frontend cần dữ liệu OHLC để vẽ biểu đồ nến
- TradingView Lightweight Charts yêu cầu format OHLC

### **2. Historical Data**
- Lưu trữ lịch sử giá để phân tích
- Backtesting trading strategies
- Compliance & audit trails

### **3. Real-time Price Updates**
- `current_price` được update mỗi phút
- P&L calculations dựa trên giá real-time
- Stop loss / take profit triggers

---

## 📊 **APIs Đã Tạo**

### **Market Data APIs:**
```
GET  /api/market/products           - Danh sách sản phẩm + current_price
GET  /api/market/candles/:symbol    - OHLC data cho charts
GET  /api/market/current-price/:symbol - Giá hiện tại
POST /api/market/sync               - Sync manual từ Binance
POST /api/market/fetch-ohlc/:symbol - Fetch fresh OHLC data
```

### **Orders APIs (sử dụng current_price):**
```
POST /api/orders/create             - Tạo lệnh với open_price = current_price
GET  /api/orders                    - List orders + real-time P&L
POST /api/orders/{id}/close         - Đóng lệnh với close_price
```

---

## 🔄 **Scheduler Tự Động**

### **File:** `backend/scheduler.js`
- **Chạy mỗi 1 phút:** Sync OHLC data từ Binance
- **Update:** `candles` table + `products.current_price`
- **Logging:** Console logs cho monitoring

### **Khởi động tự động:**
```javascript
// server.js
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler(); // ← Auto start scheduler
});
```

---

## 📈 **Ví dụ Thực Tế**

### **Scenario: User tạo lệnh BUY BTC**

**Bước 1:** Check current price
```sql
SELECT current_price FROM products WHERE symbol = 'BTC-USD';
-- Result: 45123.00000000
```

**Bước 2:** Tạo lệnh với open_price = current_price
```sql
INSERT INTO orders (product_id, side, volume, open_price, ...)
VALUES (1, 'BUY', 0.5, 45123.00000000, ...);
```

**Bước 3:** 1 phút sau, scheduler update current_price
```sql
UPDATE products SET current_price = 45200 WHERE symbol = 'BTC-USD';
```

**Bước 4:** Tính P&L real-time
```javascript
// P&L = (current_price - open_price) × volume
pnl = (45200 - 45123) × 0.5 = 38.5
```

---

## 🧪 **Test APIs**

### **1. Check Products:**
```bash
curl http://localhost:5000/api/market/products
```

### **2. Get Candles for Charts:**
```bash
curl "http://localhost:5000/api/market/candles/BTC-USD?timeframe=1m&limit=10"
```

### **3. Manual Sync:**
```bash
curl -X POST http://localhost:5000/api/market/sync \
  -H "Authorization: {token}"
```

### **4. Create Order (sử dụng current_price làm open_price):**
```bash
curl -X POST http://localhost:5000/api/orders/create \
  -H "Authorization: {token}" \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "side": "BUY", "volume": 0.1, "stop_loss": 44000, "take_profit": 47000}'
```

---

## ⚠️ **Quan Trọng: Open Price ≠ Current Price**

| Khái Niệm | Open Price | Current Price |
|-----------|------------|---------------|
| **Khi nào set** | Khi tạo lệnh | Mỗi phút từ Binance |
| **Mục đích** | Entry price của lệnh | Giá thị trường hiện tại |
| **Thay đổi** | Không bao giờ | Liên tục mỗi phút |
| **Sử dụng** | Tính P&L baseline | Tạo lệnh mới, P&L real-time |
| **Lưu trong** | `orders.open_price` | `products.current_price` |

**Tóm lại:** Open price là "giá vào lệnh", current price là "giá thị trường hiện tại". Chúng chỉ bằng nhau tại thời điểm tạo lệnh!

---

## 🚀 **Next Steps**

1. **Install dependencies:** `npm install axios`
2. **Start server:** `node server.js`
3. **Test APIs** theo hướng dẫn trên
4. **Check scheduler logs** - sẽ thấy OHLC sync mỗi phút
5. **Integrate với frontend** - sử dụng candles data cho charts

---

**📅 Ngày cập nhật:** 22/03/2026
**🔧 Status:** Ready for testing
