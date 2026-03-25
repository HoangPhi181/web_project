// Test OHLC sync from Binance
const { syncAllSymbols } = require('./utils/binanceAPI');

async function testSync() {
  try {
    console.log('Testing OHLC data sync from Binance...');
    await syncAllSymbols();
    console.log('✅ OHLC sync test completed successfully!');
  } catch (error) {
    console.error('❌ OHLC sync test failed:', error.message);
  }
}

testSync();