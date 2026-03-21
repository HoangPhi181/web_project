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
 balance DECIMAL(18,8) DEFAULT 0 CHECK (balance >= 0),
 used_margin DECIMAL(18,8) DEFAULT 0 CHECK (used_margin >= 0),
 leverage INT DEFAULT 100,
 FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- PRODUCTS
CREATE TABLE products (
 product_id INT AUTO_INCREMENT PRIMARY KEY,
 symbol VARCHAR(20) UNIQUE NOT NULL,
 name VARCHAR(50) NOT NULL,
 category ENUM('crypto','forex','gold') NOT NULL,
 is_active BOOLEAN DEFAULT TRUE
);

-- ORDERS (UPDATED 🔥)
CREATE TABLE orders (
 order_id INT AUTO_INCREMENT PRIMARY KEY,
 account_id INT NOT NULL,
 product_id INT NOT NULL,
 side ENUM('BUY','SELL') NOT NULL,
 volume DECIMAL(18,8) NOT NULL CHECK (volume > 0),

 open_price DECIMAL(18,8) NOT NULL,
 close_price DECIMAL(18,8),


 stop_loss DECIMAL(18,8),
 take_profit DECIMAL(18,8),

 status ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
 opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 closed_at TIMESTAMP NULL,

 FOREIGN KEY (account_id) REFERENCES accounts(account_id),
 FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- TRANSACTIONS (CLEAN)
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

-- CANDLES
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


CREATE INDEX idx_orders_account ON orders(account_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_candles_time ON candles(timestamp);