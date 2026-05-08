-- backend/schema.sql
-- Chạy file này để tạo database từ đầu
-- Nếu DB đã có: xem phần ALTER ở cuối file

CREATE DATABASE IF NOT EXISTS trading_exchange;
USE trading_exchange;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(50)  UNIQUE NOT NULL,
  email          VARCHAR(100) UNIQUE NOT NULL,
  country        VARCHAR(50),
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(20)  UNIQUE,
  role           ENUM('user','admin')          DEFAULT 'user',
  status_account ENUM('active','blocked')      DEFAULT 'active',
  is_online      BOOLEAN                       DEFAULT FALSE,
  verify_code    VARCHAR(6)   NULL,
  verify_code_expires TIMESTAMP NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ACCOUNTS (mỗi user có 1 tài khoản giao dịch mặc định)
-- ============================================================
CREATE TABLE accounts (
  account_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  balance     DECIMAL(18,8) DEFAULT 10000 CHECK (balance >= 0),
  used_margin DECIMAL(18,8) DEFAULT 0     CHECK (used_margin >= 0),
  leverage    INT           DEFAULT 100   CHECK (leverage > 0),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- PRODUCTS (các cặp giao dịch)
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
-- ORDERS (lệnh giao dịch)
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
-- TRANSACTIONS (nạp / rút tiền)
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
-- CANDLES (dữ liệu nến OHLC cho biểu đồ)
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
-- INDEXES (tăng tốc truy vấn)
-- ============================================================
CREATE INDEX idx_orders_account    ON orders(account_id);
CREATE INDEX idx_orders_product    ON orders(product_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_user_status ON orders(account_id, status);
CREATE INDEX idx_orders_closed     ON orders(status, closed_at DESC);
CREATE INDEX idx_transactions_acc  ON transactions(account_id);
CREATE INDEX idx_candles_time      ON candles(timestamp);
CREATE INDEX idx_products_active   ON products(is_active);
CREATE INDEX idx_accounts_user     ON accounts(user_id);

-- ============================================================
-- DATA MẪU
-- ============================================================
INSERT INTO products (symbol, name, category, current_price, is_active) VALUES
('BTC-USD', 'Bitcoin', 'crypto', 45000.00000000, TRUE);

-- ============================================================
-- NẾU DATABASE ĐÃ TỒN TẠI — chạy các ALTER này thay thế
-- ============================================================
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user','admin') DEFAULT 'user';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS status_account ENUM('active','blocked') DEFAULT 'active';
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_code VARCHAR(6) NULL;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_code_expires TIMESTAMP NULL;
-- ALTER TABLE orders MODIFY COLUMN stop_loss  DECIMAL(18,8) NULL;
-- ALTER TABLE orders MODIFY COLUMN take_profit DECIMAL(18,8) NULL;
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS leverage INT DEFAULT 100;