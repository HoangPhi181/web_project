// backend/utils/binanceAPI.js
// Fetch OHLC data from Binance API and update candles & current prices

const axios = require('axios');
const db = require('../db');

// Enable promise support for mysql2
const dbPromise = db.promise();

// WebSocket broadcasting (will be set when websocket server starts)
let broadcastPriceUpdate = null;
let broadcastCandleUpdate = null;

function setWebSocketBroadcasters(priceBroadcast, candleBroadcast) {
  broadcastPriceUpdate = priceBroadcast;
  broadcastCandleUpdate = candleBroadcast;
}

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Supported symbols mapping (our products to Binance symbols)
const SYMBOL_MAPPING = {
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'XRP-USD': 'XRPUSDT'
};

// Timeframe mapping (our timeframe to Binance interval)
const TIMEFRAME_MAPPING = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d'
};

/**
 * Fetch OHLC data from Binance for a specific symbol and timeframe
 * @param {string} symbol - Our symbol (e.g., 'BTC-USD')
 * @param {string} timeframe - Timeframe (e.g., '1m', '5m', '1h')
 * @param {number} limit - Number of candles to fetch (max 1000)
 * @returns {Array} Array of OHLC data
 */
async function fetchOHLCData(symbol, timeframe = '1m', limit = 100) {
  try {
    const binanceSymbol = SYMBOL_MAPPING[symbol];
    if (!binanceSymbol) {
      throw new Error(`Symbol ${symbol} not supported`);
    }

    const binanceInterval = TIMEFRAME_MAPPING[timeframe] || '1m';
    const url = `${BINANCE_BASE_URL}/klines`;

    const response = await axios.get(url, {
      params: {
        symbol: binanceSymbol,
        interval: binanceInterval,
        limit: Math.min(limit, 1000) // Binance max 1000
      },
      timeout: 10000 // 10 second timeout
    });

    // Transform Binance response to our format
    return response.data.map(kline => ({
      timestamp: new Date(kline[0]), // Open time
      open_price: parseFloat(kline[1]),
      high_price: parseFloat(kline[2]),
      close_price: parseFloat(kline[4]), // Close price (current price)
      low_price: parseFloat(kline[3]),
      volume: parseFloat(kline[5])
    }));

  } catch (error) {
    console.error(`Error fetching OHLC data for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch OHLC data: ${error.message}`);
  }
}

/**
 * Update candles table with new OHLC data
 * @param {string} symbol - Our symbol
 * @param {string} timeframe - Timeframe
 * @param {Array} ohlcData - Array of OHLC data
 */
async function updateCandlesData(symbol, timeframe, ohlcData) {
  try {
    // Get product_id
    const [productRows] = await dbPromise.query(
      'SELECT product_id FROM products WHERE symbol = ?',
      [symbol]
    );

    if (productRows.length === 0) {
      throw new Error(`Product ${symbol} not found`);
    }

    const productId = productRows[0].product_id;

    // Insert/update candles data
    const insertPromises = ohlcData.map(candle => {
      return dbPromise.query(`
        INSERT INTO candles (
          product_id, timeframe, timestamp,
          open_price, high_price, low_price, close_price, volume
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          open_price = VALUES(open_price),
          high_price = VALUES(high_price),
          low_price = VALUES(low_price),
          close_price = VALUES(close_price),
          volume = VALUES(volume)
      `, [
        productId,
        timeframe,
        candle.timestamp,
        candle.open_price,
        candle.high_price,
        candle.low_price,
        candle.close_price,
        candle.volume
      ]);
    });

    await Promise.all(insertPromises);
    console.log(`Updated ${ohlcData.length} candles for ${symbol} ${timeframe}`);

    // Broadcast candle updates via WebSocket
    if (broadcastCandleUpdate && ohlcData.length > 0) {
      const latestCandle = ohlcData[ohlcData.length - 1];
      broadcastCandleUpdate(symbol, {
        timestamp: latestCandle.timestamp,
        open_price: latestCandle.open_price,
        high_price: latestCandle.high_price,
        low_price: latestCandle.low_price,
        close_price: latestCandle.close_price,
        volume: latestCandle.volume
      });
    }

  } catch (error) {
    console.error(`Error updating candles for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Update current_price in products table from latest candle
 * @param {string} symbol - Our symbol
 * @param {string} timeframe - Timeframe to get latest price from
 */
async function updateCurrentPrice(symbol, timeframe = '1m') {
  try {
    // Get latest candle for this symbol and timeframe
    const [candleRows] = await dbPromise.query(`
      SELECT c.close_price
      FROM candles c
      JOIN products p ON c.product_id = p.product_id
      WHERE p.symbol = ? AND c.timeframe = ?
      ORDER BY c.timestamp DESC
      LIMIT 1
    `, [symbol, timeframe]);

    if (candleRows.length > 0) {
      const latestPrice = candleRows[0].close_price;

      // Update current_price in products
      await dbPromise.query(
        'UPDATE products SET current_price = ? WHERE symbol = ?',
        [latestPrice, symbol]
      );

      console.log(`Updated current_price for ${symbol}: ${latestPrice}`);
      // Broadcast price update via WebSocket
      if (broadcastPriceUpdate) {
        broadcastPriceUpdate(symbol, latestPrice, new Date().toISOString());
      }
      return latestPrice;
    } else {
      console.warn(`No candle data found for ${symbol} ${timeframe}`);
      return null;
    }

  } catch (error) {
    console.error(`Error updating current price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Sync all supported symbols with latest OHLC data
 * This function should be called periodically (every 1 minute)
 */
async function syncAllSymbols() {
  try {
    console.log('Starting OHLC data sync...');

    const symbols = Object.keys(SYMBOL_MAPPING);
    const timeframe = '1m'; // 1 minute candles
    const limit = 1; // Only get latest candle

    for (const symbol of symbols) {
      try {
        // Fetch latest OHLC data
        const ohlcData = await fetchOHLCData(symbol, timeframe, limit);

        if (ohlcData.length > 0) {
          // Update candles table
          await updateCandlesData(symbol, timeframe, ohlcData);

          // Update current price
          await updateCurrentPrice(symbol, timeframe);
        }

      } catch (error) {
        console.error(`Failed to sync ${symbol}:`, error.message);
        // Continue with other symbols
      }
    }

    console.log('OHLC data sync completed');

  } catch (error) {
    console.error('Error in syncAllSymbols:', error.message);
    throw error;
  }
}

/**
 * Get historical candles for a symbol (for charts)
 * @param {string} symbol - Our symbol
 * @param {string} timeframe - Timeframe
 * @param {number} limit - Number of candles to return
 * @returns {Array} Array of candle data
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
      timestamp: row.timestamp,
      open_price: parseFloat(row.open_price),
      high_price: parseFloat(row.high_price),
      low_price: parseFloat(row.low_price),
      close_price: parseFloat(row.close_price),
      volume: parseFloat(row.volume)
    }));

  } catch (error) {
    console.error(`Error getting historical candles for ${symbol}:`, error.message);
    throw error;
  }
}

module.exports = {
  fetchOHLCData,
  updateCandlesData,
  updateCurrentPrice,
  syncAllSymbols,
  getHistoricalCandles,
  setWebSocketBroadcasters,
  SYMBOL_MAPPING,
  TIMEFRAME_MAPPING
};
