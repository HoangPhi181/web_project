// Insert sample data into database
const db = require('./db');

const sampleProducts = [
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'crypto', current_price: 45000.00 },
  { symbol: 'ETH-USD', name: 'Ethereum', category: 'crypto', current_price: 2500.00 },
  { symbol: 'XRP-USD', name: 'Ripple', category: 'crypto', current_price: 0.50 }
];

console.log('Inserting sample products...');

sampleProducts.forEach(product => {
  const query = `
    INSERT INTO products (symbol, name, category, current_price)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      category = VALUES(category)
  `;

  db.query(query, [product.symbol, product.name, product.category, product.current_price], (err, result) => {
    if (err) {
      console.error(`Error inserting ${product.symbol}:`, err);
    } else {
      console.log(`✓ Inserted/Updated ${product.symbol}`);
    }
  });
});

setTimeout(() => {
  console.log('Sample data insertion completed');
  process.exit(0);
}, 2000);