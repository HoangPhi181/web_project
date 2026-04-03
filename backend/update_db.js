// Add missing columns to products table
const db = require('./db');

console.log('Adding missing columns to products table...');

const alterQueries = [
  'ALTER TABLE products ADD COLUMN current_price DECIMAL(18,8) DEFAULT 0',
  'ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
];

let queryIndex = 0;

function executeNextQuery() {
  if (queryIndex >= alterQueries.length) {
    console.log('Columns added successfully');
    insertSampleData();
    return;
  }

  const query = alterQueries[queryIndex];
  console.log(`Executing: ${query}`);

  db.query(query, (err, result) => {
    if (err) {
      console.error(`Error executing query ${queryIndex + 1}:`, err);
      // Continue with next query even if this one fails (column might already exist)
    } else {
      console.log(`✓ Query ${queryIndex + 1} executed`);
    }

    queryIndex++;
    executeNextQuery();
  });
}

function insertSampleData() {
  console.log('Inserting sample products...');

  const sampleProducts = [
    { symbol: 'BTC-USD', name: 'Bitcoin', category: 'crypto', current_price: 45000.00 },
    { symbol: 'ETH-USD', name: 'Ethereum', category: 'crypto', current_price: 2500.00 },
    { symbol: 'XRP-USD', name: 'Ripple', category: 'crypto', current_price: 0.50 }
  ];

  let insertCount = 0;

  sampleProducts.forEach(product => {
    const query = `
      INSERT INTO products (symbol, name, category, current_price)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        current_price = VALUES(current_price)
    `;

    db.query(query, [product.symbol, product.name, product.category, product.current_price], (err, result) => {
      if (err) {
        console.error(`Error inserting ${product.symbol}:`, err);
      } else {
        console.log(`✓ Inserted/Updated ${product.symbol}`);
      }

      insertCount++;
      if (insertCount === sampleProducts.length) {
        console.log('Sample data insertion completed!');
        process.exit(0);
      }
    });
  });
}

executeNextQuery();