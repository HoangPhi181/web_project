// Test WebSocket real-time price updates
const WebSocket = require('ws');

const WS_URL = 'ws://localhost:5000';

function testWebSocket() {
  console.log('🔌 Testing WebSocket real-time price updates...\n');

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');

    // Subscribe to price updates
    ws.send(JSON.stringify({
      type: 'subscribe',
      symbols: ['BTC-USD', 'ETH-USD', 'XRP-USD']
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'connected') {
        console.log('📡', message.message);
      } else if (message.type === 'price_update') {
        const time = new Date(message.timestamp).toLocaleTimeString();
        console.log(`💰 ${message.symbol}: $${message.price.toFixed(2)} (${time})`);
      } else if (message.type === 'candle_update') {
        const time = new Date(message.candle.timestamp).toLocaleTimeString();
        console.log(`📊 ${message.symbol} Candle: O:${message.candle.open_price.toFixed(2)} H:${message.candle.high_price.toFixed(2)} L:${message.candle.low_price.toFixed(2)} C:${message.candle.close_price.toFixed(2)} (${time})`);
      } else if (message.type === 'subscribed') {
        console.log('📈 Subscribed to symbols:', message.symbols.join(', '));
      }
    } catch (error) {
      console.log('📨 Raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });

  // Close after 30 seconds
  setTimeout(() => {
    console.log('\n⏰ Test completed - closing connection');
    ws.close();
  }, 30000);
}

// Run test
testWebSocket();