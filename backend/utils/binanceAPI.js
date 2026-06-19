// backend/utils/binanceAPI.js
// Toàn bộ data từ Binance WebSocket — KHÔNG dùng REST (tránh 418)

const WebSocket = require('ws');
const db = require('../db');

const dbPromise = db.promise();

let broadcastPriceUpdate = null;
let broadcastCandleUpdate = null;

function setWebSocketBroadcasters(priceBroadcast, candleBroadcast) {
  broadcastPriceUpdate = priceBroadcast;
  broadcastCandleUpdate = candleBroadcast;
}

const SYMBOL_MAPPING = {
  'BTC-USD': 'BTCUSDT'
};

const TIMEFRAME_MAPPING = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1h': '1h', '4h': '4h', '1d': '1d'
};

let latestPrices = {};
let binanceWs = null;

// ─────────────────────────────────────────────────────────────
// Binance Combined Stream: miniTicker (giá) + kline_1m (candle)
// ─────────────────────────────────────────────────────────────

function startBinancePriceStream() {
  // Gộp 2 stream vào 1 kết nối duy nhất
  const streams = Object.values(SYMBOL_MAPPING).flatMap(s => [
    `${s.toLowerCase()}@miniTicker`,
    `${s.toLowerCase()}@kline_1m`
  ]).join('/');

  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
  console.log('Connecting to Binance combined stream...');

  binanceWs = new WebSocket(url);

  binanceWs.on('open', () => {
    console.log('✅ Binance stream connected');
  });

  binanceWs.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      const data = msg.data;
      if (!data) return;

      // Map Binance symbol → our symbol
      const ourSymbol = Object.entries(SYMBOL_MAPPING)
        .find(([, v]) => v === data.s)?.[0];
      if (!ourSymbol) return;

      // ── miniTicker: cập nhật giá realtime ──
      if (data.e === '24hrMiniTicker') {
        const price = parseFloat(data.c);
        latestPrices[ourSymbol] = price;

        await dbPromise.query(
          'UPDATE products SET current_price = ?, updated_at = NOW() WHERE symbol = ?',
          [price, ourSymbol]
        );

        if (broadcastPriceUpdate) {
          broadcastPriceUpdate(ourSymbol, price, new Date().toISOString());
        }
      }

      // ── kline: cập nhật candle ──
      if (data.e === 'kline') {
        const k = data.k;
        const candle = {
          timestamp:   new Date(k.t),
          open_price:  parseFloat(k.o),
          high_price:  parseFloat(k.h),
          low_price:   parseFloat(k.l),
          close_price: parseFloat(k.c),
          volume:      parseFloat(k.v)
        };

        await updateCandlesData(ourSymbol, k.i, [candle]);
      }

    } catch (err) {
      console.error('Stream message error:', err.message);
    }
  });

  binanceWs.on('close', () => {
    console.warn('⚠️  Binance stream closed. Reconnecting in 5s...');
    binanceWs = null;
    setTimeout(startBinancePriceStream, 5000);
  });

  binanceWs.on('error', (err) => {
    console.error('Binance stream error:', err.message);
  });
}

// ─────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────

async function updateCandlesData(symbol, timeframe, ohlcData) {
  try {
    const [productRows] = await dbPromise.query(
      'SELECT product_id FROM products WHERE symbol = ?', [symbol]
    );
    if (productRows.length === 0) throw new Error(`Product ${symbol} not found`);
    const productId = productRows[0].product_id;

    const insertPromises = ohlcData.map(candle =>
      dbPromise.query(`
        INSERT INTO candles (
          product_id, timeframe, timestamp,
          open_price, high_price, low_price, close_price, volume
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          open_price  = VALUES(open_price),
          high_price  = VALUES(high_price),
          low_price   = VALUES(low_price),
          close_price = VALUES(close_price),
          volume      = VALUES(volume)
      `, [
        productId, timeframe, candle.timestamp,
        candle.open_price, candle.high_price,
        candle.low_price,  candle.close_price, candle.volume
      ])
    );
    await Promise.all(insertPromises);

    if (broadcastCandleUpdate && ohlcData.length > 0) {
      const latest = ohlcData[ohlcData.length - 1];
      broadcastCandleUpdate(symbol, { ...latest });
    }
  } catch (error) {
    console.error(`Error updating candles for ${symbol}:`, error.message);
  }
}

async function getHistoricalCandles(symbol, timeframe = '1m', limit = 100) {
  try {
    const [rows] = await dbPromise.query(`
      SELECT c.timestamp, c.open_price, c.high_price,
             c.low_price, c.close_price, c.volume
      FROM candles c
      JOIN products p ON c.product_id = p.product_id
      WHERE p.symbol = ? AND c.timeframe = ?
      ORDER BY c.timestamp DESC
      LIMIT ?
    `, [symbol, timeframe, limit]);

    return rows.reverse().map(row => ({
      timestamp:   row.timestamp,
      open_price:  parseFloat(row.open_price),
      high_price:  parseFloat(row.high_price),
      low_price:   parseFloat(row.low_price),
      close_price: parseFloat(row.close_price),
      volume:      parseFloat(row.volume)
    }));
  } catch (error) {
    console.error(`Error getting historical candles:`, error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// syncAllSymbols — giữ signature cũ, nhưng không làm gì
// (stream tự xử lý cả giá lẫn candle)
// ─────────────────────────────────────────────────────────────

async function syncAllSymbols() {
  // No-op: stream handles everything
  // Giữ hàm này để không break scheduler cũ trong server.js
}

// Stub giữ tương thích
async function fetchOHLCData() { return []; }
async function fetchRealtimePrice() { return null; }
async function updateCurrentPrice() { return null; }

module.exports = {
  fetchOHLCData,
  fetchRealtimePrice,
  updateCandlesData,
  updateCurrentPrice,
  syncAllSymbols,
  getHistoricalCandles,
  setWebSocketBroadcasters,
  startBinancePriceStream,
  SYMBOL_MAPPING,
  TIMEFRAME_MAPPING
};