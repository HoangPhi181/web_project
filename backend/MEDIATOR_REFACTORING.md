# Trading Platform - Mediator Pattern Refactoring

## Overview

Your trading project has been successfully refactored using the **Mediator Pattern** as the central communication hub. This architecture decouples routes from database logic, making the codebase more maintainable, testable, and scalable.

## Architecture

```
Request → Route (Thin Controller) → CentralMediator (Business Logic) → Database
```

### Key Components

1. **CentralMediator** - Central hub containing all business logic
2. **Thin Controllers** - Routes that validate input, call mediator, return response
3. **Error Handling** - Centralized error classes with proper HTTP status codes
4. **Middleware** - Authentication and authorization checks

---

## Files Created & Modified

### ✅ Created Files

#### 1. `backend/mediators/CentralMediator.js`
Central hub with 4 modules:

**AuthModule:**
- `registerUser(username, email, password, country)` - Register new user with default 'user' role
- `loginUser(email, password)` - Login and return JWT with role & id

**TradingModule:**
- `createOrder(userId, productId, side, volume, stopLoss, takeProfit)` - Create trading order
- `closeOrder(userId, orderId, closePrice)` - Close order and update balance

**TransactionModule:**
- `sendWithdrawCode(userId)` - Send 6-digit verification code
- `processWithdraw(userId, amount, verifyCode)` - Verify and process withdrawal
- `processDeposit(userId, amount)` - Initiate deposit with QR code

**AdminModule:**
- `getAllUsersDetailed(adminId)` - Get all users with accounts and total PnL
- `updateSystemSettings(adminId, settings)` - Update system settings

#### 2. `backend/routes/admin.js`
Admin-only routes (protected by `verifyAdmin` middleware):
- `GET /api/admin/users` - Get detailed user list with accounts and orders
- `PUT /api/admin/settings` - Update system settings

#### 3. `backend/routes/transactions.js`
Transaction routes for deposits and withdrawals:
- `POST /api/transactions/withdraw/code` - Request withdrawal code
- `POST /api/transactions/withdraw/verify` - Process withdrawal with verification
- `POST /api/transactions/deposit` - Initiate deposit

### ✅ Modified Files

#### 1. `backend/middleware/authMiddleware.js`
**Added:**
- `verifyAdmin(req, res, next)` - Middleware to verify admin role
- JWT payload now includes: `id`, `role`, `username`

**Usage:**
```javascript
router.get("/admin-only", verifyAdmin, (req, res) => {
  // Only admins can access
});
```

#### 2. `backend/routes/auth.js`
**Refactored to Thin Controller:**
- Removed all database logic
- Now uses `CentralMediator.registerUser()` and `CentralMediator.loginUser()`
- Focused only on: Validation → Mediator Call → Response

**Key Changes:**
- JWT now includes `role` and `id` fields
- Better error handling with status codes

#### 3. `backend/routes/orders.js`
**Refactored to Thin Controller:**
- `POST /create` - Uses `CentralMediator.createOrder()`
- `GET /` - Retrieves open orders (direct DB query)
- `POST /:id/close` - Uses `CentralMediator.closeOrder()`
- `GET /history/list` - Retrieves order history (direct DB query)

#### 4. `backend/schema.sql`
**Added Columns:**
```sql
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';
ALTER TABLE users ADD COLUMN verify_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN verify_code_expires TIMESTAMP NULL;
```

**For Existing Databases:**
Run these SQL commands if your database already exists:
```sql
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';
ALTER TABLE users ADD COLUMN verify_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN verify_code_expires TIMESTAMP NULL;
```

#### 5. `backend/server.js`
**Added Route Registration:**
```javascript
app.use("/api/admin", adminRoutes);
app.use("/api/transactions", transactionRoutes);
```

#### 6. `backend/utils/validators.js`
**Added:**
- `validateLogin(body)` - Validate login input

---

## API Documentation

### Authentication APIs

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "trader_john",
  "email": "john@example.com",
  "password": "SecurePass123",
  "country": "Vietnam"
}

Response (201):
{
  "message": "Register success",
  "userId": 1
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response (200):
{
  "message": "Login success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "trader_john",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Trading APIs

#### Create Order
```
POST /api/orders/create
Authorization: <token>
Content-Type: application/json

{
  "product_id": 1,
  "side": "BUY",
  "volume": 0.5,
  "stop_loss": 40000,
  "take_profit": 50000
}

Response (201):
{
  "message": "Order created successfully",
  "order_id": 1,
  "open_price": "45000.00000000",
  "symbol": "BTC-USD",
  "status": "OPEN",
  "required_margin": "225.00000000"
}
```

#### Get Open Orders
```
GET /api/orders
Authorization: <token>

Response (200):
{
  "message": "Orders retrieved successfully",
  "count": 2,
  "data": [
    {
      "order_id": 1,
      "symbol": "BTC-USD",
      "side": "BUY",
      "volume": "0.50000000",
      "open_price": "45000.00000000",
      "current_price": "46000.00000000",
      "pnl": "500.00000000",
      "pnl_percent": "2.44",
      "status": "OPEN",
      "opened_at": "2026-04-29T10:30:00.000Z"
    }
  ]
}
```

#### Close Order
```
POST /api/orders/{order_id}/close
Authorization: <token>
Content-Type: application/json

{
  "close_price": 46500
}

Response (200):
{
  "message": "Order closed successfully",
  "order_id": 1,
  "close_price": "46500.00000000",
  "profit_loss": "750.00000000",
  "pnl_percent": "3.66",
  "status": "CLOSED"
}
```

#### Get Order History
```
GET /api/orders/history/list?page=1&limit=20
Authorization: <token>

Response (200):
{
  "message": "Order history retrieved successfully",
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  },
  "data": [...]
}
```

### Transaction APIs

#### Request Withdrawal Code
```
POST /api/transactions/withdraw/code
Authorization: <token>

Response (200):
{
  "message": "Verification code sent",
  "code": "123456"  // Only in development
}
```

#### Process Withdrawal
```
POST /api/transactions/withdraw/verify
Authorization: <token>
Content-Type: application/json

{
  "amount": 1000,
  "verify_code": "123456"
}

Response (200):
{
  "message": "Withdrawal processed successfully",
  "amount": "1000.00000000",
  "reference_code": "WD-1234567890-abc123",
  "status": "COMPLETED"
}
```

#### Initiate Deposit
```
POST /api/transactions/deposit
Authorization: <token>
Content-Type: application/json

{
  "amount": 5000
}

Response (200):
{
  "message": "Deposit initiated - QR code generated",
  "amount": "5000.00000000",
  "qr_code": "VietQR-1-1234567890",
  "reference_code": "DEP-1234567890-xyz789",
  "status": "PENDING",
  "instructions": "Send funds to the provided QR code..."
}
```

### Admin APIs

#### Get All Users (Admin Only)
```
GET /api/admin/users
Authorization: <admin-token>

Response (200):
{
  "message": "Users retrieved successfully",
  "count": 5,
  "data": [
    {
      "user_id": 1,
      "username": "trader_john",
      "email": "john@example.com",
      "country": "Vietnam",
      "role": "user",
      "created_at": "2026-04-29T10:30:00.000Z",
      "accounts": [
        {
          "account_id": 1,
          "balance": "9250.00000000",
          "used_margin": "225.00000000",
          "leverage": 100,
          "total_orders": 15,
          "total_pnl": "1250.00000000"
        }
      ]
    }
  ]
}
```

#### Update System Settings (Admin Only)
```
PUT /api/admin/settings
Authorization: <admin-token>
Content-Type: application/json

{
  "maintenance_mode": false,
  "max_leverage": 200
}

Response (200):
{
  "message": "System settings updated successfully",
  "updated_at": "2026-04-29T10:30:00.000Z"
}
```

---

## Error Handling

The system uses standardized HTTP status codes:

| Code | Error | Example |
|------|-------|---------|
| 400 | Validation Error | Invalid input |
| 401 | Unauthorized | No token or wrong token |
| 402 | Insufficient Balance | Not enough margin |
| 403 | Forbidden | Admin access required |
| 404 | Not Found | Order not found |
| 409 | Conflict | Order already closed |
| 500 | Server Error | Database error |

**Error Response Format:**
```json
{
  "message": "Error message",
  "errors": {
    "field": "error description"
  }
}
```

---

## Withdrawal Flow with Verification

```
1. User requests code: POST /api/transactions/withdraw/code
   ↓
2. Code sent via email (logged in console for dev)
   ↓
3. User submits code + amount: POST /api/transactions/withdraw/verify
   ↓
4. Check: Code valid? → Check balance available? → ACID Transaction
   ↓
5. Deduct from balance + Create transaction record + Clear code
   ↓
6. Return reference code (for tracking)
```

**Key Features:**
- ACID transactions ensure consistency
- Code expires after 10 minutes
- Balance checked against `used_margin`
- Reference codes for audit trail

---

## Benefits of Mediator Pattern

### ✅ Separation of Concerns
- Routes handle HTTP protocol
- Mediator handles business logic
- Database layer isolated

### ✅ Testability
- Mediator methods can be tested independently
- No need to mock HTTP requests

### ✅ Reusability
- Business logic can be used by WebSocket, CLI, etc.

### ✅ Maintainability
- Changes to business logic only affect mediator
- Routes remain thin and focused

### ✅ Error Handling
- Centralized error classes with proper status codes
- Consistent error responses across all endpoints

---

## Implementation Checklist

- [x] Create CentralMediator with all modules
- [x] Add role column to users table
- [x] Add verify_code column to users table
- [x] Update authMiddleware with verifyAdmin
- [x] Refactor auth.js to use mediator
- [x] Refactor orders.js to use mediator
- [x] Create admin.js routes
- [x] Create transactions.js routes
- [x] Update server.js with new routes
- [x] Add validateLogin function
- [ ] **Next: Run SQL migrations for existing databases**
- [ ] **Next: Test all endpoints with Postman/Insomnia**
- [ ] **Next: Update frontend to include role in auth flow**

---

## Database Migration Steps (For Existing Databases)

```sql
-- Connect to your database
USE trading_exchange;

-- Add new columns if they don't exist
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';
ALTER TABLE users ADD COLUMN verify_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN verify_code_expires TIMESTAMP NULL;

-- Verify changes
DESCRIBE users;
```

---

## Next Steps

1. **Database Setup:**
   - Run the SQL ALTER statements above if using existing database
   - Or recreate database using updated schema.sql

2. **Environment Variables:**
   - Ensure `JWT_SECRET` is set in `.env`

3. **Testing:**
   - Test all endpoints with admin account
   - Verify withdrawal code flow

4. **Frontend Integration:**
   - Update login to include role
   - Add admin dashboard routes
   - Implement withdrawal code verification flow

5. **Production Deployment:**
   - Implement actual email sending for withdrawal codes
   - Integrate with VietQR API for real QR codes
   - Add transaction completion webhooks

---

## Coding Style Maintained

✅ Consistent with existing style:
- Callback-based database queries
- Error handling with try-catch
- Input validation before processing
- ACID transactions for critical operations
- Detailed comments explaining logic
- Descriptive variable names

---

**Status:** ✅ Refactoring Complete - Ready for Testing
