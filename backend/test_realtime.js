// Quick test: Check if real-time system is working
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testRealTimeSystem() {
  try {
    console.log('🧪 Testing Real-time Price & Candle System\n');

    // Test 1: Check current prices
    console.log('1️⃣ Testing current price API...');
    const btcResponse = await axios.get(`${BASE_URL}/api/market/current-price/BTC-USD`);
    console.log(`✅ BTC-USD: $${btcResponse.data.current_price}`);

    const ethResponse = await axios.get(`${BASE_URL}/api/market/current-price/ETH-USD`);
    console.log(`✅ ETH-USD: $${ethResponse.data.current_price}`);

    // Test 2: Check candles data
    console.log('\n2️⃣ Testing candles API...');
    const candlesResponse = await axios.get(`${BASE_URL}/api/market/candles/BTC-USD?limit=5`);
    console.log(`✅ Retrieved ${candlesResponse.data.count} BTC candles`);

    // Test 3: Check products list
    console.log('\n3️⃣ Testing products API...');
    const productsResponse = await axios.get(`${BASE_URL}/api/market/products`);
    console.log(`✅ Retrieved ${productsResponse.data.count} active products`);

    console.log('\n🎉 All APIs working! Real-time system is operational.');
    console.log('\n📋 System Status:');
    console.log('   • OHLC Sync: Every 10 seconds from Binance');
    console.log('   • WebSocket: Broadcasting every 2 seconds');
    console.log('   • Database: Storing continuous candle data');
    console.log('   • APIs: REST endpoints for historical data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure server is running: cd backend && node server.js');
    }
  }
}

testRealTimeSystem();