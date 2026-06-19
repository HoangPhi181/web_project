// backend/utils/binanceAPI.js
// Fetch OHLC data from Binance API and update candles & current prices

const axios = require('axios');
const WebSocket = require('ws');
const db = require('../db');

const dbPromise = db.promise();

// WebSocket broadcasting
let broadcastPriceUpdate = null;
let broadcastCandleUpdate = null;

function setWebSocketBroadcasters(priceBroadcast, candleBroadcast) {
  broadcastPriceUpdate = priceBroadcast;
  broadcastCandleUpdate = candleBroadcast;
}

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

const SYMBOL_MAPPING = {
  'BTC-USD': 'BTCUSDT'
};

const TIMEFRAME_MAPPING = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d'
};

// Cache giá mới nhất (dùng nội bộ nếu cần)
let latestPrices = {};

// ─────────────────────────────────────────────
// Binance WebSocket Price Stream (thay REST polling)
// ─────────────────────────────────────────────

let binanceWs = null;

/**
 * Kết nối Binance miniTicker stream để nhận giá realtime
 * Thay thế hoàn toàn fetchRealtimePrice() + updateCurrentPrice()
 */
function startBinancePriceStream() {
  const streams = Object.values(SYMBOL_MAPPING)
    .map(s => `${s.toLowerCase()}@miniTicker`)
    .join('/');

  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  console.log(`Connecting to Binance stream: ${url}`);
  binanceWs = new WebSocket(url);

  binanceWs.on('open', () => {
    console.log('✅ Connected to Binance price stream');
  });

  binanceWs.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      const ticker = msg.data;
      const price = parseFloat(ticker.c); // c = close/current price

      // Map BTCUSDT → BTC-USD
      const ourSymbol = Object.entries(SYMBOL_MAPPING)
        .find(([, v]) => v === ticker.s)?.[0];

      if (!ourSymbol) return;

      latestPrices[ourSymbol] = price;

      // Cập nhật DB
      await dbPromise.query(
        'UPDATE products SET current_price = ?, updated_at = NOW() WHERE symbol = ?',
        [price, ourSymbol]
      );

      // Broadcast qua WebSocket server của bạn
      if (broadcastPriceUpdate) {
        broadcastPriceUpdate(ourSymbol, price, new Date().toISOString());
      }

    } catch (err) {
      console.error('Error processing Binance stream message:', err.message);
    }
  });

  binanceWs.on('close', () => {
    console.warn('⚠️ Binance stream disconnected. Reconnecting in 5s...');
    binanceWs = null;
    setTimeout(startBinancePriceStream, 5000);
  });

  binanceWs.on('error', (err) => {
    console.error('Binance stream error:', err.message);
    // 'close' event sẽ tự trigger reconnect
  });
}

// ─────────────────────────────────────────────
// Giữ lại fetchRealtimePrice để tương thích (fallback)
// Nhưng KHÔNG dùng trong syncAllSymbols nữa
// ─────────────────────────────────────────────

/**
 * @deprecated Dùng startBinancePriceStream() thay thế
 */
async function fetchRealtimePrice(symbol) {
  try {
    const binanceSymbol = SYMBOL_MAPPING[symbol];
    if (!binanceSymbol) throw new Error(`Symbol ${symbol} not supported`);

    const response = await axios.get(`${BINANCE_BASE_URL}/ticker/price`, {
      params: { symbol: binanceSymbol },
      timeout: 5000
    });

    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Error fetching realtime price for ${symbol}:`, error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────
// OHLC / Klines (vẫn dùng REST — ít request hơn, không bị 418)
// ─────────────────────────────────────────────

/**
 * Fetch OHLC data from Binance klines
 */
async function fetchOHLCData(symbol, timeframe = '1m', limit = 100) {
  try {
    const binanceSymbol = SYMBOL_MAPPING[symbol];
    if (!binanceSymbol) throw new Error(`Symbol ${symbol} not supported`);

    const binanceInterval = TIMEFRAME_MAPPING[timeframe] || '1m';

    const response = await axios.get(`${BINANCE_BASE_URL}/klines`, {
      params: {
        symbol: binanceSymbol,
        interval: binanceInterval,
        limit: Math.min(limit, 1000)
      },
      timeout: 10000
    });

    return response.data.map(kline => ({
      timestamp:   new Date(kline[0]),
      open_price:  parseFloat(kline[1]),
      high_price:  parseFloat(kline[2]),
      low_price:   parseFloat(kline[3]),
      close_price: parseFloat(kline[4]),
      volume:      parseFloat(kline[5])
    }));

  } catch (error) {
    console.error(`Error fetching OHLC data for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch OHLC data: ${error.message}`);
  }
}

/**
 * Update candles table
 */
async function updateCandlesData(symbol, timeframe, ohlcData) {
  try {
    const [productRows] = await dbPromise.query(
      'SELECT product_id FROM products WHERE symbol = ?',
      [symbol]
    );

    if (productRows.length === 0) throw new Error(`Product ${symbol} not found`);

    const productId = productRows[0].product_id;

    const insertPromises = ohlcData.map(candle => {
      return dbPromise.query(`
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
      ]);
    });

    await Promise.all(insertPromises);
    console.log(`Updated ${ohlcData.length} candles for ${symbol} ${timeframe}`);

    // Broadcast candle update
    if (broadcastCandleUpdate && ohlcData.length > 0) {
      const latest = ohlcData[ohlcData.length - 1];
      broadcastCandleUpdate(symbol, {
        timestamp:   latest.timestamp,
        open_price:  latest.open_price,
        high_price:  latest.high_price,
        low_price:   latest.low_price,
        close_price: latest.close_price,
        volume:      latest.volume
      });
    }

  } catch (error) {
    console.error(`Error updating candles for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * @deprecated Giá realtime nay do stream xử lý
 * Giữ lại để không break code cũ nếu có nơi gọi
 */
async function updateCurrentPrice(symbol) {
  try {
    // Nếu đã có giá từ stream thì dùng luôn
    if (latestPrices[symbol]) {
      const price = latestPrices[symbol];
      await dbPromise.query(
        'UPDATE products SET current_price = ?, updated_at = NOW() WHERE symbol = ?',
        [price, symbol]
      );
      if (broadcastPriceUpdate) {
        broadcastPriceUpdate(symbol, price, new Date().toISOString());
      }
      return price;
    }

    // Fallback: gọi REST (chỉ khi stream chưa kết nối)
    const latestPrice = await fetchRealtimePrice(symbol);
    await dbPromise.query(
      'UPDATE products SET current_price = ?, updated_at = NOW() WHERE symbol = ?',
      [latestPrice, symbol]
    );
    if (broadcastPriceUpdate) {
      broadcastPriceUpdate(symbol, latestPrice, new Date().toISOString());
    }
    return latestPrice;

  } catch (error) {
    console.error(`Error updating current price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Sync candles (giá realtime do stream lo — không cần gọi updateCurrentPrice)
 * Chỉ còn cập nhật klines cho chart history
 */
async function syncAllSymbols() {
  try {
    console.log('Starting candle sync...');

    const symbols = Object.keys(SYMBOL_MAPPING);

    for (const symbol of symbols) {
      try {
        // ✅ KHÔNG gọi updateCurrentPrice() nữa → tránh 418
        // Giá realtime đã được startBinancePriceStream() xử lý

        const ohlcData = await fetchOHLCData(symbol, '1m', 2);
        if (ohlcData.length > 0) {
          await updateCandlesData(symbol, '1m', ohlcData);
        }

      } catch (error) {
        console.error(`Failed to sync ${symbol}:`, error.message);
      }
    }

    console.log('Candle sync completed');

  } catch (error) {
    console.error('Error in syncAllSymbols:', error.message);
    throw error;
  }
}

/**
 * Get historical candles for charts
 */
async function getHistoricalCandles(symbol, timeframe = '1m', limit = 100) {
  try {
    const [rows] = await dbPromise.query(`
      SELECT
        c.timestamp,
        c.open_price,
        c.high_price,
        c.low_price,
        c.close_price,
        c.volume
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
    console.error(`Error getting historical candles for ${symbol}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchOHLCData,
  fetchRealtimePrice,
  updateCandlesData,
  updateCurrentPrice,
  syncAllSymbols,
  getHistoricalCandles,
  setWebSocketBroadcasters,
  startBinancePriceStream,   // ← export mới
  SYMBOL_MAPPING,
  TIMEFRAME_MAPPING
};