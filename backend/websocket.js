// backend/websocket.js
// WebSocket server for real-time price updates

const WebSocket = require('ws');
const db = require('./db');

let wss = null;
const clients = new Set();

// Broadcast price updates to all connected clients
function broadcastPriceUpdate(symbol, price, timestamp) {
  const message = JSON.stringify({
    type: 'price_update',
    symbol: symbol,
    price: parseFloat(price),
    timestamp: timestamp
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast candle updates for charts
function broadcastCandleUpdate(symbol, candle) {
  const message = JSON.stringify({
    type: 'candle_update',
    symbol: symbol,
    candle: candle
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start WebSocket server
function startWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket client connected');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to trading platform WebSocket',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 Received:', data);

        // Handle client messages if needed
        if (data.type === 'subscribe') {
          ws.send(JSON.stringify({
            type: 'subscribed',
            symbols: data.symbols || ['BTC-USD', 'ETH-USD', 'XRP-USD']
          }));
        }
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      clients.delete(ws);
    });
  });

  console.log('🚀 WebSocket server started');
}

// Get current prices for broadcasting
async function getCurrentPrices() {
  try {
    const [rows] = await db.promise().query(
      'SELECT symbol, current_price FROM products WHERE is_active = TRUE'
    );
    return rows;
  } catch (error) {
    console.error('❌ Error getting current prices:', error);
    return [];
  }
}

// Periodic broadcast of current prices
function startPriceBroadcast() {
  setInterval(async () => {
    const prices = await getCurrentPrices();
    prices.forEach(price => {
      broadcastPriceUpdate(price.symbol, price.current_price, new Date().toISOString());
    });
  }, 2000); // Broadcast every 2 seconds
}

module.exports = {
  startWebSocketServer,
  broadcastPriceUpdate,
  broadcastCandleUpdate,
  startPriceBroadcast
};