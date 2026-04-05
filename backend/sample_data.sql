-- Insert sample products for testing
INSERT INTO products (symbol, name, category, current_price) VALUES
('BTC-USD', 'Bitcoin', 'crypto', 45000.00),
('ETH-USD', 'Ethereum', 'crypto', 2500.00),
('XRP-USD', 'Ripple', 'crypto', 0.50)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category);