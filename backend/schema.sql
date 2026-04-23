-- CREATE DATABASE
CREATE DATABASE IF NOT EXISTS trading_exchange;
USE trading_exchange;

-- USERS
CREATE TABLE users (
 user_id INT AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(50) UNIQUE NOT NULL,
 email VARCHAR(100) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACCOUNTS
CREATE TABLE accounts (
 account_id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 balance DECIMAL(18,8) DEFAULT 10000 CHECK (balance >= 0),
 used_margin DECIMAL(18,8) DEFAULT 0 CHECK (used_margin >= 0),
 leverage INT DEFAULT 100 CHECK (leverage > 0),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- PRODUCTS
CREATE TABLE products (
 product_id INT AUTO_INCREMENT PRIMARY KEY,
 symbol VARCHAR(20) UNIQUE NOT NULL,
 name VARCHAR(50) NOT NULL,
 category ENUM('crypto','forex','gold') NOT NULL,
 current_price DECIMAL(18,8) DEFAULT 0,
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ORDERS
CREATE TABLE orders (
 order_id INT AUTO_INCREMENT PRIMARY KEY,
 account_id INT NOT NULL,
 product_id INT NOT NULL,
 side ENUM('BUY','SELL') NOT NULL,
 volume DECIMAL(18,8) NOT NULL CHECK (volume > 0),
 
 open_price DECIMAL(18,8) NOT NULL,
 close_price DECIMAL(18,8),
 profit_loss DECIMAL(18,8),
 
 stop_loss DECIMAL(18,8),
 take_profit DECIMAL(18,8),
 
 status ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
 opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 closed_at TIMESTAMP NULL,
 
 FOREIGN KEY (account_id) REFERENCES accounts(account_id),
 FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- TRANSACTIONS
CREATE TABLE transactions (
 transaction_id INT AUTO_INCREMENT PRIMARY KEY,
 account_id INT NOT NULL,
 amount DECIMAL(18,8) NOT NULL CHECK (amount > 0),
 type ENUM('DEPOSIT','WITHDRAW') NOT NULL,
 status ENUM('PENDING','COMPLETED','FAILED') DEFAULT 'PENDING',
 reference_code VARCHAR(100),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 
 FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- CANDLES (OHLC data for charts)
CREATE TABLE candles (
 product_id INT NOT NULL,
 timeframe VARCHAR(5) NOT NULL,
 timestamp TIMESTAMP NOT NULL,
 open_price DECIMAL(18,8) NOT NULL,
 high_price DECIMAL(18,8) NOT NULL,
 low_price DECIMAL(18,8) NOT NULL,
 close_price DECIMAL(18,8) NOT NULL,
 volume DECIMAL(18,8) DEFAULT 0,
 
 PRIMARY KEY (product_id, timeframe, timestamp),
 FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- INDEXES FOR OPTIMIZATION
CREATE INDEX idx_orders_account ON orders(account_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_status ON orders(account_id, status);
CREATE INDEX idx_orders_closed_time ON orders(status, closed_at DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_candles_time ON candles(timestamp);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_accounts_user ON accounts(user_id);

-- INSERT SAMPLE PRODUCTS
INSERT INTO products (symbol, name, category, current_price, is_active) VALUES
('BTC-USD', 'Bitcoin', 'crypto', 45000.00000000, TRUE),