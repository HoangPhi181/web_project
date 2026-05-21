// backend/websocket.js
// WebSocket server for real-time price updates

const WebSocket = require('ws');
const db = require('./db');

let wss = null;
const clients = new Set();

/**
 * Broadcast a price update to all connected clients.
 * Format is aligned with what PriceChart.jsx expects.
 *
 * @param {string} symbol    - e.g. "BTC-USD"
 * @param {number} price     - current price
 * @param {string} timestamp - ISO 8601 string
 */
function broadcastPriceUpdate(symbol, price, timestamp) {
    const parsedPrice = parseFloat(price);

    const message = JSON.stringify({
        type:      'price_update',
        symbol:    symbol,            // must match frontend apiSymbol: "BTC-USD"
        price:     parsedPrice,
        timestamp: timestamp,
        // Legacy fallback block so older clients still work
        data: {
            close_price: parsedPrice,
            timestamp:   timestamp
        }
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Broadcast a full OHLCV candle update.
 * Frontend reads msg.candle.close and msg.candle.timestamp.
 *
 * @param {string} symbol
 * @param {{ open, high, low, close, timestamp }} candle
 */
function broadcastCandleUpdate(symbol, candle) {
    const message = JSON.stringify({
        type:   'candle_update',
        symbol: symbol,
        candle: {
            open:      parseFloat(candle.open),
            high:      parseFloat(candle.high),
            low:       parseFloat(candle.low),
            close:     parseFloat(candle.close),
            timestamp: candle.timestamp
        },
        // Also expose close/timestamp at the top level so both message types
        // can be handled with the same field resolution in the frontend
        price:     parseFloat(candle.close),
        timestamp: candle.timestamp
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Attach the WebSocket server to an existing HTTP server.
 * Call this once from your main server file, e.g.:
 *   const { startWebSocketServer, startPriceBroadcast } = require('./websocket');
 *   startWebSocketServer(server);
 *   startPriceBroadcast();
 *
 * @param {import('http').Server} server
 */
function startWebSocketServer(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        console.log(`🔌 New WebSocket client connected: ${ip}`);
        clients.add(ws);

        // Send welcome / handshake
        ws.send(JSON.stringify({
            type:      'connected',
            message:   'Connected to trading platform WebSocket',
            timestamp: new Date().toISOString()
        }));

        ws.on('message', rawMessage => {
            try {
                const data = JSON.parse(rawMessage.toString());
                console.log('📨 Received from client:', data);

                if (data.type === 'subscribe') {
                    // Acknowledge subscription request
                    ws.send(JSON.stringify({
                        type:    'subscribed',
                        symbols: data.symbols || []
                    }));
                }
            } catch (err) {
                console.error('❌ WebSocket message parse error:', err.message);
            }
        });

        ws.on('close', () => {
            console.log(`🔌 WebSocket client disconnected: ${ip}`);
            clients.delete(ws);
        });

        ws.on('error', err => {
            console.error('❌ WebSocket client error:', err.message);
            clients.delete(ws);
        });
    });

    console.log('🚀 WebSocket server started');
}

/**
 * Query DB for current prices of all active products.
 * Symbols in DB should be stored as "BTC-USD" format (dash-separated).
 */
async function getCurrentPrices() {
    try {
        const [rows] = await db.promise().query(
            'SELECT symbol, current_price FROM products WHERE is_active = TRUE'
        );
        return rows;
    } catch (err) {
        console.error('❌ Error fetching current prices from DB:', err.message);
        return [];
    }
}

/**
 * Start broadcasting current prices to all clients every 2 seconds.
 * Call this after startWebSocketServer().
 */
function startPriceBroadcast() {
    console.log('📡 Starting price broadcast (every 2s)…');

    setInterval(async () => {
        // Skip if no clients are connected
        if (clients.size === 0) return;

        const prices = await getCurrentPrices();

        if (!prices.length) {
            console.warn('⚠️  No active products found in DB — check products table');
            return;
        }

        prices.forEach(row => {
            broadcastPriceUpdate(
                row.symbol,                  // e.g. "BTC-USD"
                row.current_price,
                new Date().toISOString()
            );
        });
    }, 2000);
}

module.exports = {
    startWebSocketServer,
    startPriceBroadcast,
    broadcastPriceUpdate,
    broadcastCandleUpdate
};