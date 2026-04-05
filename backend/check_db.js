// Check database structure
const db = require('./db');

console.log('Checking products table structure...');

db.query('DESCRIBE products', (err, results) => {
  if (err) {
    console.error('Error describing products table:', err);
    process.exit(1);
  }

  console.log('Products table structure:');
  results.forEach(row => {
    console.log(`- ${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
  });

  process.exit(0);
});