// backend/websocket.js
const WebSocket = require('ws');
const db        = require('./db');

let wss = null;
const clients       = new Set();
const userSocketMap = new Map();
const onlineUsers   = new Set();

//  Broadcast 

function broadcastAll(payload) {
    const msg = JSON.stringify(payload);
    clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function broadcastPriceUpdate(symbol, price, timestamp) {
    const parsedPrice = parseFloat(price);
    const msg = JSON.stringify({
        type: 'price_update', symbol, price: parsedPrice, timestamp,
        data: { close_price: parsedPrice, timestamp }
    });
    clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function broadcastCandleUpdate(symbol, candle) {
    const msg = JSON.stringify({
        type: 'candle_update', symbol,
        candle: {
            open: parseFloat(candle.open), high: parseFloat(candle.high),
            low:  parseFloat(candle.low),  close: parseFloat(candle.close),
            timestamp: candle.timestamp
        },
        price: parseFloat(candle.close), timestamp: candle.timestamp
    });
    clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function broadcastActiveCount() {
    broadcastAll({ type: 'active_users', count: onlineUsers.size, timestamp: new Date().toISOString() });
}

//  Active Users 

async function registerUser(ws, userId) {
    ws._userId = userId;
    if (!userSocketMap.has(userId)) userSocketMap.set(userId, new Set());
    userSocketMap.get(userId).add(ws);

    if (!onlineUsers.has(userId)) {
        onlineUsers.add(userId);
        try { await db.promise().query('UPDATE users SET is_online=TRUE WHERE user_id=?', [userId]); } catch (_) {}
    }
    broadcastActiveCount();
}

async function unregisterUser(ws) {
    const userId = ws._userId;
    if (!userId) return;
    const sockets = userSocketMap.get(userId);
    if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
            userSocketMap.delete(userId);
            onlineUsers.delete(userId);
            try { await db.promise().query('UPDATE users SET is_online=FALSE WHERE user_id=?', [userId]); } catch (_) {}
        }
    }
    broadcastActiveCount();
}

// Server

function startWebSocketServer(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        console.log(`🔌 New WebSocket client: ${ip}`);
        clients.add(ws);

        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to Nova Trading WebSocket',
            active_users: onlineUsers.size,
            timestamp: new Date().toISOString()
        }));

        ws.on('message', async (raw) => {
            try {
                const data = JSON.parse(raw.toString());

                if (data.type === 'identify') {
                    // Gửi sau khi đăng nhập — đánh dấu online
                    if (data.userId) await registerUser(ws, data.userId);
                }

                if (data.type === 'subscribe') {
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        symbols: data.symbols || ['BTC-USD']
                    }));
                }

                if (data.type === 'get_active_users') {
                    ws.send(JSON.stringify({
                        type: 'active_users',
                        count: onlineUsers.size,
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (err) {
                console.error('❌ WS message error:', err.message);
            }
        });

        ws.on('close', async () => {
            console.log(`🔌 WS disconnected: ${ip}`);
            clients.delete(ws);
            await unregisterUser(ws);
        });

        ws.on('error', async (err) => {
            console.error('❌ WS error:', err.message);
            clients.delete(ws);
            await unregisterUser(ws);
        });
    });

    // Heartbeat
    setInterval(() => {
        clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.ping(); });
    }, 30000);

    console.log('🚀 WebSocket server started');
}

async function getCurrentPrices() {
    try {
        const [rows] = await db.promise().query(
            'SELECT symbol, current_price FROM products WHERE is_active=TRUE'
        );
        return rows;
    } catch (err) {
        console.error('❌ Error fetching prices:', err.message);
        return [];
    }
}

function startPriceBroadcast() {
    console.log('📡 Starting price broadcast (every 2s)…');
    setInterval(async () => {
        if (clients.size === 0) return;
        const prices = await getCurrentPrices();
        prices.forEach(row => {
            broadcastPriceUpdate(row.symbol, row.current_price, new Date().toISOString());
        });
    }, 2000);
}

module.exports = {
    startWebSocketServer, startPriceBroadcast,
    broadcastPriceUpdate, broadcastCandleUpdate,
    getOnlineCount:   () => onlineUsers.size,
    getOnlineUserIds: () => Array.from(onlineUsers),
};
