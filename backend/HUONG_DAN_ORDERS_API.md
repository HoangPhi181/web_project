# 🚀 Hướng Dẫn Hoàn Thành 4 APIs Quản Lý Lệnh (Orders)
## Dự Án: Nền Tảng Giao Dịch Chứng Chỉ Tài Chính - Tuần 3-4

---

## 📋 Tổng Quan 4 APIs Cần Hoàn Thành

| API | Method | Purpose | Priority |
|-----|--------|---------|----------|
| POST /api/orders/create | POST | Tạo lệnh BUY/SELL mới | 🔴 Cao |
| GET /api/orders | GET | Danh sách lệnh đang mở | 🔴 Cao |
| POST /api/orders/{id}/close | POST | Đóng lệnh | 🔴 Cao |
| GET /api/orders/history | GET | Lịch sử giao dịch | 🟡 Trung |

---

## 🎯 API 1: Tạo Lệnh BUY/SELL
### `POST /api/orders/create`

### 📝 Request Body:
```json
{
  "product_id": 1,
  "side": "BUY",
  "volume": 0.5,
  "stop_loss": 40000,
  "take_profit": 50000
}
```

### 📤 Response Success (201):
```json
{
  "message": "Order created successfully",
  "order_id": 123,
  "open_price": 45000,
  "status": "OPEN"
}
```

### ❌ Response Error:
```json
{
  "message": "Insufficient balance",
  "required_margin": 2250,
  "available_balance": 1000
}
```

### 🔧 Yêu Cầu Kỹ Thuật:

#### **Validation:**
- ✓ Kiểm tra user đã login (middleware)
- ✓ product_id tồn tại và is_active = true
- ✓ side = "BUY" hoặc "SELL"
- ✓ volume > 0 và <= 1000 (max volume)
- ✓ stop_loss < open_price < take_profit (nếu BUY)
- ✓ take_profit < open_price < stop_loss (nếu SELL)

#### **Business Logic:**
```
- Lấy current_price từ products table (hoặc WebSocket nếu realtime)
- Tính Required Margin = (current_price × volume × 100) / leverage
  (Ví dụ: 45000 × 0.5 × 100 / 100 = 2250)
- Kiểm tra: account.balance >= Required Margin + used_margin
- Cập nhật account: used_margin += Required Margin
- INSERT history transaction nếu cần tracking
```

#### **Transaction Management:**
```sql
START TRANSACTION;
  UPDATE accounts SET used_margin = used_margin + ? WHERE account_id = ?;
  INSERT INTO orders (...) VALUES (...);
COMMIT;
```

#### **Best Practices:**
- 🔐 Dùng prepared statements (db.query với ?)
- 🔐 Locking account row khi update (SELECT ... FOR UPDATE)
- 📊 Logging tất cả order creation
- ⏱️ Timestamp chính xác (opened_at = server time)

---

## 🎯 API 2: Lấy Danh Sách Lệnh Đang Mở
### `GET /api/orders`

### 📤 Response Success (200):
```json
{
  "message": "Orders retrieved",
  "count": 3,
  "data": [
    {
      "order_id": 123,
      "product_id": 1,
      "symbol": "BTC-USD",
      "side": "BUY",
      "volume": 0.5,
      "open_price": 45000,
      "stop_loss": 40000,
      "take_profit": 50000,
      "current_price": 46500,
      "pnl": 750,
      "pnl_percent": 3.33,
      "status": "OPEN",
      "opened_at": "2026-03-22T10:30:00Z"
    }
  ]
}
```

### 🔧 Yêu Cầu Kỹ Thuật:

#### **Query Logic:**
```sql
SELECT 
  o.order_id, o.account_id, o.product_id,
  p.symbol, p.name,
  o.side, o.volume, o.open_price, o.stop_loss, o.take_profit,
  o.status, o.opened_at,
  -- Tính current_price (from realtime hoặc WebSocket)
  COALESCE(p.current_price, 0) as current_price
FROM orders o
JOIN products p ON o.product_id = p.product_id
JOIN accounts a ON o.account_id = a.account_id
WHERE a.user_id = ? AND o.status = 'OPEN'
ORDER BY o.opened_at DESC
```

#### **Calculate P&L (Server-side):**
```javascript
// Nếu BUY: P&L = (current_price - open_price) × volume
// Nếu SELL: P&L = (open_price - current_price) × volume

if (order.side === 'BUY') {
  pnl = (currentPrice - order.open_price) * order.volume;
} else {
  pnl = (order.open_price - currentPrice) * order.volume;
}
pnl_percent = (pnl / (order.open_price * order.volume)) * 100;
```

#### **Best Practices:**
- 📊 JOIN với products để lấy symbol & current_price
- 🔍 Filter theo user_id (từ JWT token)
- ⚡ Chỉ fetch OPEN orders (vì CLOSED orders quá nhiều)
- 📈 Tính P&L real-time dựa trên current_price (để từ WebSocket)
- 🔄 Cache nếu dữ liệu không thay đổi (1 phút)

---

## 🎯 API 3: Đóng Lệnh
### `POST /api/orders/{id}/close`

### 📝 Request Body:
```json
{
  "close_price": 46500
}
```

### 📤 Response Success (200):
```json
{
  "message": "Order closed successfully",
  "order_id": 123,
  "close_price": 46500,
  "pnl": 750,
  "pnl_percent": 3.33,
  "closed_at": "2026-03-22T11:45:00Z"
}
```

### 🔧 Yêu Cầu Kỹ Thuật:

#### **Logic Đóng Lệnh:**
```
1. Kiểm tra order tồn tại & status = OPEN
2. Kiểm tra order thuộc account của user
3. Verify close_price hợp lý (không quá lệch với market price)
4. Tính P&L = (close_price - open_price) × volume (nếu BUY)
5. UPDATE orders: status=CLOSED, close_price, closed_at
6. UPDATE accounts: used_margin -= require_margin (tính toán lại)
7. INSERT transaction log (nếu P&L > 0 thì như WITHDRAW)
8. UPDATE balance = balance + P&L (nếu BUY và P&L > 0)
```

#### **Transaction Management (Critical!):**
```sql
START TRANSACTION;
  -- Lock order row
  SELECT * FROM orders WHERE order_id = ? FOR UPDATE;
  
  -- Kiểm tra vẫn OPEN
  -- Tính toán P&L
  
  -- Update order
  UPDATE orders SET 
    status = 'CLOSED',
    close_price = ?,
    closed_at = NOW()
  WHERE order_id = ?;
  
  -- Update account
  UPDATE accounts SET 
    used_margin = used_margin - ?,
    balance = balance + ?
  WHERE account_id = ?;
  
COMMIT;
```

#### **Best Practices:**
- 🔐 Lock row để tránh race condition (khi 2 request close cùng 1 order)
- 📊 Kiểm tra close_price không quá lệch (±10% so với market price)
- 📈 Tính toán P&L chính xác theo side (BUY vs SELL)
- ⏱️ Timestamp chính xác (closed_at = server time)
- 🔄 Rollback nếu có lỗi khi update

---

## 🎯 API 4: Lịch Sử Giao Dịch
### `GET /api/orders/history`

### 📝 Query Parameters:
```
?page=1&limit=20&sort=desc&symbol=BTC-USD
```

### 📤 Response Success (200):
```json
{
  "message": "Order history retrieved",
  "total": 45,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "order_id": 120,
      "symbol": "BTC-USD",
      "side": "BUY",
      "volume": 0.5,
      "open_price": 45000,
      "close_price": 46500,
      "pnl": 750,
      "pnl_percent": 3.33,
      "status": "CLOSED",
      "opened_at": "2026-03-22T09:00:00Z",
      "closed_at": "2026-03-22T10:30:00Z",
      "duration_minutes": 90
    }
  ]
}
```

### 🔧 Yêu Cầu Kỹ Thuật:

#### **Query Logic:**
```sql
SELECT 
  o.order_id, o.product_id,
  p.symbol, o.side, o.volume,
  o.open_price, o.close_price,
  o.status, o.opened_at, o.closed_at
FROM orders o
JOIN products p ON o.product_id = p.product_id
JOIN accounts a ON o.account_id = a.account_id
WHERE a.user_id = ? AND o.status = 'CLOSED'
ORDER BY o.closed_at DESC
LIMIT ? OFFSET ?
```

#### **Pagination:**
```javascript
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
const page = parseInt(req.query.page) || 1;
const offset = (page - 1) * limit;

// Query 1: Lấy data
const historyQuery = "SELECT ... LIMIT ? OFFSET ?";
db.query(historyQuery, [limit, offset], callback);

// Query 2: Lấy total count
const countQuery = "SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = 'CLOSED'";
db.query(countQuery, [userId], callback);
```

#### **Best Practices:**
- 📊 Chỉ fetch CLOSED orders (giúp tối ưu performance)
- 🔍 Hỗ trợ pagination (limit 20-100 records mỗi page)
- 🔄 Hỗ trợ filter theo symbol/date range
- ⚡ Lập index trên (user_id, status, closed_at) để tối ưu query
- 📈 Tính toán P&L & P&L% server-side

---

## 📁 Cấu Trúc File Khuyến Nghị

```
backend/
├── routes/
│   ├── auth.js              (✓ Đã hoàn thành)
│   └── orders.js            (❌ CẦN TẠO)
├── utils/
│   ├── validators.js        (❌ CẦN TẠO - Input validation)
│   ├── errors.js            (❌ CẦN TẠO - Error handling)
│   └── calculations.js      (❌ CẦN TẠO - P&L calculations)
├── middleware/
│   ├── authMiddleware.js    (✓ Đã có)
│   └── errorHandler.js      (❌ CẦN TẠO - Global error handler)
├── db.js                    ✓ Đã sửa
├── server.js                ⚠️ CẦN CẬP NHẬT (thêm orders route)
└── ...
```

---

## 🛡️ Input Validation Best Practices

### **Sử dụng Validator Library:**
```javascript
// Install: npm install validator
const validator = require('validator');

// Validation function:
function validateOrderCreate(req) {
  const errors = {};
  
  // product_id
  if (!req.body.product_id || !Number.isInteger(req.body.product_id)) {
    errors.product_id = 'Invalid product ID';
  }
  
  // side
  if (!['BUY', 'SELL'].includes(req.body.side)) {
    errors.side = 'Side must be BUY or SELL';
  }
  
  // volume
  if (!req.body.volume || req.body.volume <= 0 || req.body.volume > 1000) {
    errors.volume = 'Volume must be between 0 and 1000';
  }
  
  // stop_loss/take_profit
  if (req.body.stop_loss && req.body.take_profit) {
    if (req.body.side === 'BUY' && req.body.stop_loss >= req.body.take_profit) {
      errors.price = 'For BUY: stop_loss < take_profit';
    }
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}
```

### **Sanitize Input:**
```javascript
// Loại bỏ ký tự nguy hiểm
const sanitized = {
  product_id: parseInt(req.body.product_id),
  side: req.body.side.toUpperCase(),
  volume: parseFloat(req.body.volume).toFixed(8),
  stop_loss: parseFloat(req.body.stop_loss).toFixed(8),
  take_profit: parseFloat(req.body.take_profit).toFixed(8)
};
```

---

## 🚨 Error Handling Best Practices

### **Centralized Error Handler:**
```javascript
// errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400);
    this.errors = errors;
  }
}

class InsufficientBalanceError extends AppError {
  constructor(required, available) {
    super('Insufficient balance', 402);
    this.required = required;
    this.available = available;
  }
}

module.exports = { AppError, ValidationError, InsufficientBalanceError };
```

### **Global Error Middleware:**
```javascript
// server.js
app.use((err, req, res, next) => {
  console.error(err);
  
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.errors
    });
  }
  
  if (err instanceof InsufficientBalanceError) {
    return res.status(err.statusCode).json({
      message: err.message,
      required_margin: err.required,
      available_balance: err.available
    });
  }
  
  res.status(500).json({ message: 'Internal server error' });
});
```

---

## 📊 Database Optimization

### **Thêm Indexes:**
```sql
-- Tối ưu queries:
CREATE INDEX idx_orders_user ON orders(account_id, status);
CREATE INDEX idx_orders_closed_time ON orders(status, closed_at DESC);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_products_active ON products(is_active);
```

### **Cập nhật Schema (nếu cần):**
```sql
-- Thêm current_price vào products (để tránh JOIN WebSocket)
ALTER TABLE products ADD COLUMN current_price DECIMAL(18,8) DEFAULT 0;

-- Thêm profit_loss calculated field
ALTER TABLE orders ADD COLUMN profit_loss DECIMAL(18,8) DEFAULT 0;
```

---

## 🔄 Vòng Lặp Triển Khai (Implementation Loop)

### **TUẦN 3 - NGÀY 1-2:**
- [ ] **Task 1:** Tạo file `backend/routes/orders.js` cơ bản
- [ ] **Task 2:** Hoàn thành API 1 (POST /create) với validation đầy đủ
- [ ] **Task 3:** Hoàn thành API 2 (GET /orders) + tính P&L
- [ ] **Task 4:** Test API 1 & 2 bằng Postman

### **TUẦN 3 - NGÀY 3-4:**
- [ ] **Task 5:** Hoàn thành API 3 (POST /{id}/close) với transaction
- [ ] **Task 6:** Hoàn thành API 4 (GET /history) với pagination
- [ ] **Task 7:** Test API 3 & 4 bằng Postman
- [ ] **Task 8:** Fix bugs phát hiện

### **TUẦN 3 - NGÀY 5:**
- [ ] **Task 9:** Tạo `backend/utils/validators.js` centralized
- [ ] **Task 10:** Tạo `backend/utils/calculations.js` centralized
- [ ] **Task 11:** Tạo `backend/utils/errors.js` (error classes)

### **TUẦN 4 - NGÀY 1-2:**
- [ ] **Task 12:** Refactor auth.js + orders.js dùng validators & error handler
- [ ] **Task 13:** Thêm global error middleware vào server.js
- [ ] **Task 14:** Thêm database indexes

### **TUẦN 4 - NGÀY 3-4:**
- [ ] **Task 15:** Full integration test (API 1-4)
- [ ] **Task 16:** Performance testing & optimization
- [ ] **Task 17:** Security audit (SQL injection, validation)

### **TUẦN 4 - NGÀY 5:**
- [ ] **Task 18:** Documentation + API docs (Swagger)
- [ ] **Task 19:** Prepare for frontend integration
- [ ] **Task 20:** Final review & deployment prep

---

## 📋 Checklist Trước Khi Push Code

- [ ] Tất cả APIs đã hoạt động & test qua Postman
- [ ] Input validation đầy đủ (không crash, không SQL injection)
- [ ] Error handling chính xác (response codes: 400, 401, 402, 404, 500)
- [ ] Transaction management - không race condition
- [ ] Database queries tối ưu (có indexes)
- [ ] Code sạch & follow naming convention
- [ ] Có comments giải thích logic phức tạp
- [ ] Không hardcode secrets (dùng .env)
- [ ] Test edge cases (amount = 0, negative number, null, etc.)
- [ ] Performance acceptable (query < 1 second)

---

## 🎯 Phương Án Tối Ưu Best Practice

### **1. Security:**
```
✅ Prepared statements (parameterized queries)
✅ Input validation & sanitization
✅ Rate limiting (express-rate-limit)
✅ CORS properly configured
✅ JWT expiration & refresh tokens
✅ Environment variables (.env)
```

### **2. Performance:**
```
✅ Database indexes trên frequently queried columns
✅ Connection pooling (mysql2 pool)
✅ Query result caching (1 minute max)
✅ Pagination untuk large datasets
✅ SELECT only needed columns (không SELECT *)
```

### **3. Reliability:**
```
✅ Transaction management cho critical operations
✅ Row-level locking để tránh race conditions
✅ Comprehensive error handling
✅ Logging (console.log → future: Winston)
✅ Rollback mechanism
```

### **4. Maintainability:**
```
✅ Centralized validation logic
✅ Centralized error handling
✅ Reusable utility functions
✅ Clear folder structure
✅ Comments & documentation
```

---

## 📚 Tài Liệu Tham Khảo

- Express.js: https://expressjs.com/
- MySQL2 Transactions: https://github.com/sidorares/node-mysql2#transactions
- JWT Best Practices: https://tools.ietf.org/html/rfc8949
- Node.js Security: https://owasp.org/www-project-nodejs-top-10/

---

**Mục tiêu:** Hoàn thành 4 APIs orders này sẽ giúp TV1 đạt 70% tiến độ backend, sẵn sàng cho tích hợp frontend ở tuần 5.

**Ngày cập nhật:** 22/03/2026
