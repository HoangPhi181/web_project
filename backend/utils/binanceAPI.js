// backend/utils/binanceAPI.js
// Fetch OHLC data from Binance API and update candles & current prices

const axios = require('axios');
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

/**
 * Fetch giá realtime từ Binance ticker (KHÔNG dùng klines)
 * Trả về giá giao dịch mới nhất, cập nhật liên tục
 * @param {string} symbol - Our symbol (e.g., 'BTC-USD')
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
 * Update current_price trong products từ giá realtime Binance ticker
 * ✅ FIX: dùng ticker/price thay vì lấy từ candle đã đóng
 */
async function updateCurrentPrice(symbol) {
  try {
    // Lấy giá realtime từ Binance ticker
    const latestPrice = await fetchRealtimePrice(symbol);

    // Cập nhật DB
    await dbPromise.query(
      'UPDATE products SET current_price = ?, updated_at = NOW() WHERE symbol = ?',
      [latestPrice, symbol]
    );

    console.log(`Updated current_price for ${symbol}: ${latestPrice}`);

    // Broadcast qua WebSocket
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
 * Sync tất cả symbols:
 * - Mỗi 10s: cập nhật giá realtime từ ticker
 * - Mỗi 1m:  cập nhật candle từ klines (để chart có lịch sử)
 */
async function syncAllSymbols() {
  try {
    console.log('Starting OHLC data sync...');

    const symbols = Object.keys(SYMBOL_MAPPING);

    for (const symbol of symbols) {
      try {
        // ✅ Luôn cập nhật giá realtime từ ticker
        await updateCurrentPrice(symbol);

        // Cập nhật candle 1m mới nhất vào DB (để chart history đúng)
        const ohlcData = await fetchOHLCData(symbol, '1m', 2);
        if (ohlcData.length > 0) {
          await updateCandlesData(symbol, '1m', ohlcData);
        }

      } catch (error) {
        console.error(`Failed to sync ${symbol}:`, error.message);
      }
    }

    console.log('OHLC data sync completed');

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
  SYMBOL_MAPPING,
  TIMEFRAME_MAPPING
};