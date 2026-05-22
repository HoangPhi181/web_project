-- backend/schema.sql (v2)
-- Thay đổi chính: bảng accounts thêm cột account_type ENUM('REAL','DEMO')
-- Mỗi user đăng ký sẽ tự động có 2 tài khoản:
--   1 tài khoản REAL — balance = 0   (nạp tiền thật mới có)
--   1 tài khoản DEMO — balance = 10000 (tiền ảo, luyện tập)
-- Tất cả bảng orders, transactions đều JOIN qua account_id
-- → Không cần sửa gì thêm ở orders và transactions
DROP DATABASE IF EXISTS trading_exchange;
CREATE DATABASE IF NOT EXISTS trading_exchange;
USE trading_exchange;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  user_id             INT AUTO_INCREMENT PRIMARY KEY,
  username            VARCHAR(50)  UNIQUE NOT NULL,
  email               VARCHAR(100) UNIQUE NOT NULL,
  country             VARCHAR(50),
  password_hash       VARCHAR(255) NOT NULL,
  phone               VARCHAR(20)  UNIQUE,
  role                ENUM('user','admin','superadmin')     DEFAULT 'user',
  avatar			  LONGTEXT,
  status_account      ENUM('active','blocked') DEFAULT 'active',
  is_online           BOOLEAN                  DEFAULT FALSE,
  verify_code         VARCHAR(6)   NULL,
  verify_code_expires TIMESTAMP    NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users
MODIFY avatar LONGTEXT;
-- ============================================================
-- ACCOUNTS
-- Mỗi user có đúng 2 tài khoản:
--   REAL: balance = 0, cần nạp tiền thật để trade
--   DEMO: balance = 10000 (tiền ảo), chỉ dùng để luyện tập
--
-- Ràng buộc UNIQUE(user_id, account_type):
--   → Đảm bảo mỗi user chỉ có đúng 1 REAL và 1 DEMO
-- ============================================================
CREATE TABLE accounts (
  account_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT  NOT NULL,
  account_type ENUM('REAL','DEMO') NOT NULL DEFAULT 'DEMO',
  balance      DECIMAL(18,8) DEFAULT 0     CHECK (balance >= 0),
  used_margin  DECIMAL(18,8) DEFAULT 0     CHECK (used_margin >= 0),
  leverage     INT           DEFAULT 100   CHECK (leverage > 0),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id)

  -- Mỗi user chỉ có đúng 1 REAL và 1 DEMO
--   UNIQUE KEY uq_user_account_type (user_id, account_type)
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  product_id    INT AUTO_INCREMENT PRIMARY KEY,
  symbol        VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(50) NOT NULL,
  category      ENUM('crypto','forex','gold') NOT NULL,
  current_price DECIMAL(18,8) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- ORDERS
-- Không thay đổi gì — account_id tự phân biệt REAL/DEMO
-- ============================================================
CREATE TABLE orders (
  order_id    INT AUTO_INCREMENT PRIMARY KEY,
  account_id  INT NOT NULL,
  product_id  INT NOT NULL,
  side        ENUM('BUY','SELL') NOT NULL,
  volume      DECIMAL(18,8) NOT NULL CHECK (volume > 0),
  open_price  DECIMAL(18,8) NOT NULL,
  close_price DECIMAL(18,8),
  profit_loss DECIMAL(18,8),
  stop_loss   DECIMAL(18,8) NULL,
  take_profit DECIMAL(18,8) NULL,
  status      ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
  opened_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at   TIMESTAMP NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ============================================================
-- TRANSACTIONS
-- Chỉ tài khoản REAL mới được nạp/rút tiền thật
-- Tài khoản DEMO không có transactions (tiền ảo, reset được)
-- ============================================================
CREATE TABLE transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  account_id     INT NOT NULL,
  amount         DECIMAL(18,8) NOT NULL CHECK (amount > 0),
  type           ENUM('DEPOSIT','WITHDRAW') NOT NULL,
  status         ENUM('PENDING','COMPLETED','FAILED') DEFAULT 'PENDING',
  reference_code VARCHAR(100),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- ============================================================
-- CANDLES
-- ============================================================
CREATE TABLE candles (
  product_id  INT          NOT NULL,
  timeframe   VARCHAR(5)   NOT NULL,
  timestamp   TIMESTAMP    NOT NULL,
  open_price  DECIMAL(18,8) NOT NULL,
  high_price  DECIMAL(18,8) NOT NULL,
  low_price   DECIMAL(18,8) NOT NULL,
  close_price DECIMAL(18,8) NOT NULL,
  volume      DECIMAL(18,8) DEFAULT 0,
  PRIMARY KEY (product_id, timeframe, timestamp),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_orders_account     ON orders(account_id);
CREATE INDEX idx_orders_product     ON orders(product_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_user_status ON orders(account_id, status);
CREATE INDEX idx_orders_closed      ON orders(status, closed_at DESC);
CREATE INDEX idx_transactions_acc   ON transactions(account_id);
CREATE INDEX idx_candles_time       ON candles(timestamp);
CREATE INDEX idx_products_active    ON products(is_active);
CREATE INDEX idx_accounts_user      ON accounts(user_id);
CREATE INDEX idx_accounts_type      ON accounts(user_id, account_type);

-- ============================================================
-- DATA MẪU
-- ============================================================
INSERT INTO products (symbol, name, category, current_price, is_active) VALUES
('BTC-USD', 'Bitcoin', 'crypto', 45000.00000000, TRUE);

INSERT INTO users (username, email, password_hash, role) 
VALUES ('SuperAdmin', 'spadmin@gmail.com', '$2b$10$t7gpWmUze/qOQ/wVwUrOmu1ytx15OXyVHzFJ8ptnhv69Z6BBc9plC', 'superadmin');

-- ============================================================
-- NẾU DATABASE ĐÃ TỒN TẠI — chạy ALTER này
-- ============================================================
-- Bước 1: Thêm cột account_type
-- ALTER TABLE accounts ADD COLUMN account_type ENUM('REAL','DEMO') NOT NULL DEFAULT 'REAL' AFTER user_id;

-- Bước 2: Đặt tất cả account hiện có là REAL
-- UPDATE accounts SET account_type = 'REAL';

-- Bước 3: Tạo tài khoản DEMO cho tất cả user hiện có
-- INSERT INTO accounts (user_id, account_type, balance, leverage)
-- SELECT user_id, 'DEMO', 10000, 100 FROM users;

-- Bước 4: Thêm unique constraint
-- ALTER TABLE accounts ADD UNIQUE KEY uq_user_account_type (user_id, account_type);

-- ============================================================
-- NẾU DATABASE ĐÃ TỒN TẠI — thêm superadmin vào ENUM
-- ============================================================
-- ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','superadmin') DEFAULT 'user';
-- Sau đó chạy: node init_superadmin.js