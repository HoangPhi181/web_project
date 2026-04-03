// Demo: Lấy dữ liệu nến 1 phút từ Binance và hiển thị
const axios = require('axios');

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Test lấy nến 1 phút cho BTCUSDT
async function demoCandles() {
  try {
    console.log('📊 Demo: Lấy dữ liệu nến 1 phút từ Binance\n');

    const symbol = 'BTCUSDT';
    const interval = '1m';
    const limit = 5; // Lấy 5 nến gần nhất

    const response = await axios.get(`${BINANCE_BASE_URL}/klines`, {
      params: {
        symbol: symbol,
        interval: interval,
        limit: limit
      },
      timeout: 10000
    });

    console.log(`Nến ${interval} cho ${symbol}:`);
    console.log('='.repeat(80));

    response.data.forEach((kline, index) => {
      const timestamp = new Date(kline[0]).toLocaleTimeString();
      const open = parseFloat(kline[1]);
      const high = parseFloat(kline[2]);
      const low = parseFloat(kline[3]);
      const close = parseFloat(kline[4]);
      const volume = parseFloat(kline[5]);

      const direction = close > open ? '🟢 UP' : close < open ? '🔴 DOWN' : '⚪ SIDE';

      console.log(`${index + 1}. ${timestamp}`);
      console.log(`   Open: $${open.toFixed(2)} | High: $${high.toFixed(2)} | Low: $${low.toFixed(2)} | Close: $${close.toFixed(2)}`);
      console.log(`   Volume: ${volume.toFixed(4)} | ${direction}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ Dữ liệu được cập nhật mỗi 1 phút!');
    console.log('💡 Trong hệ thống trading: mỗi phút sẽ có 1 nến mới được thêm vào.');

  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu:', error.message);
  }
}

demoCandles();