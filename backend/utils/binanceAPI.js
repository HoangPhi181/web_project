// backend/utils/binanceAPI.js
const axios = require('axios');
const db = require('../db');

// Kích hoạt tính năng dùng Promise cho mysql2
const dbPromise = db.promise();

// Biến lưu trữ hàm phát tín hiệu (Sẽ được server.js nạp vào)
let broadcastPriceUpdate = null;
let broadcastCandleUpdate = null;

/**
 * Hàm này dùng để kết nối "cái loa" WebSocket vào file API này
 */
function setWebSocketBroadcasters(priceBroadcast, candleBroadcast) {
  broadcastPriceUpdate = priceBroadcast;
  broadcastCandleUpdate = candleBroadcast;
}

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Cấu hình các cặp tiền hỗ trợ
const SYMBOL_MAPPING = {
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'XRP-USD': 'XRPUSDT'
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
 * Lấy dữ liệu OHLC từ Binance API
 */
async function fetchOHLCData(symbol, timeframe = '1m', limit = 100) {
  try {
    const binanceSymbol = SYMBOL_MAPPING[symbol];
    if (!binanceSymbol) throw new Error(`Symbol ${symbol} không được hỗ trợ`);

    const binanceInterval = TIMEFRAME_MAPPING[timeframe] || '1m';
    const url = `${BINANCE_BASE_URL}/klines`;

    const response = await axios.get(url, {
      params: {
        symbol: binanceSymbol,
        interval: binanceInterval,
        limit: Math.min(limit, 1000)
      },
      timeout: 10000
    });

    return response.data.map(kline => ({
      timestamp: new Date(kline[0]), // Thời gian mở nến
      open_price: parseFloat(kline[1]),
      high_price: parseFloat(kline[2]),
      low_price: parseFloat(kline[3]),
      close_price: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
  } catch (error) {
    console.error(`Lỗi fetch dữ liệu ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Lưu dữ liệu nến vào Database và PHÁT WEBSOCKET
 */
async function updateCandlesData(symbol, timeframe, ohlcData) {
  try {
    // 1. Tìm product_id từ bảng products
    const [productRows] = await dbPromise.query(
      'SELECT product_id FROM products WHERE symbol = ?',
      [symbol]
    );

    if (productRows.length === 0) throw new Error(`Không tìm thấy sản phẩm ${symbol}`);
    const productId = productRows[0].product_id;

    // 2. Lưu vào Database (Dùng ON DUPLICATE KEY để cập nhật nếu trùng timestamp)
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
        productId, timeframe, candle.timestamp,
        candle.open_price, candle.high_price, candle.low_price, candle.close_price, candle.volume
      ]);
    });

    await Promise.all(insertPromises);
    console.log(`[OK] Đã cập nhật nến cho ${symbol} ${timeframe}`);

    // 3. ĐÂY LÀ CHỖ LÀM NẾN NHẢY: Phát tin nhắn qua WebSocket
    if (broadcastCandleUpdate && ohlcData.length > 0) {
      const latest = ohlcData[ohlcData.length - 1];
      broadcastCandleUpdate(symbol, {
        timestamp: latest.timestamp,
        open_price: latest.open_price,
        high_price: latest.high_price,
        low_price: latest.low_price,
        close_price: latest.close_price
      });
    }
  } catch (error) {
    console.error(`Lỗi lưu database ${symbol}:`, error.message);
  }
}

/**
 * Cập nhật giá hiện tại vào bảng products
 */
async function updateCurrentPrice(symbol, timeframe = '1m') {
  try {
    const [rows] = await dbPromise.query(`
      SELECT c.close_price FROM candles c
      JOIN products p ON c.product_id = p.product_id
      WHERE p.symbol = ? AND c.timeframe = ?
      ORDER BY c.timestamp DESC LIMIT 1
    `, [symbol, timeframe]);

    if (rows.length > 0) {
      const price = rows[0].close_price;
      await dbPromise.query('UPDATE products SET current_price = ? WHERE symbol = ?', [price, symbol]);
      
      console.log(`[DB] Updated current_price ${symbol}: ${price}`);

      // Phát giá đơn lẻ cho bảng giá (nếu cần)
      if (broadcastPriceUpdate) {
        broadcastPriceUpdate(symbol, price, new Date().toISOString());
      }
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Lỗi cập nhật giá hiện tại ${symbol}:`, error.message);
  }
}

/**
 * Vòng lặp đồng bộ toàn bộ các cặp tiền
 */
async function syncAllSymbols() {
  try {
    console.log('--- Bắt đầu Sync dữ liệu OHLC ---');
    const symbols = Object.keys(SYMBOL_MAPPING);
    
    for (const symbol of symbols) {
      try {
        const data = await fetchOHLCData(symbol, '1m', 1);
        if (data.length > 0) {
          await updateCandlesData(symbol, '1m', data);
          await updateCurrentPrice(symbol, '1m');
        }
      } catch (e) {
        console.error(`Thất bại khi sync ${symbol}:`, e.message);
      }
    }
    console.log('--- Sync hoàn tất ---');
  } catch (error) {
    console.error('Lỗi syncAllSymbols:', error.message);
  }
}

/**
 * Lấy lịch sử nến (dùng cho API GET /candles)
 */
async function getHistoricalCandles(symbol, timeframe = '1m', limit = 100) {
  try {
    const [rows] = await dbPromise.query(`
      SELECT c.timestamp, c.open_price, c.high_price, c.low_price, c.close_price, c.volume
      FROM candles c
      JOIN products p ON c.product_id = p.product_id
      WHERE p.symbol = ? AND c.timeframe = ?
      ORDER BY c.timestamp DESC LIMIT ?
    `, [symbol, timeframe, limit]);

    return rows.reverse().map(r => ({
      timestamp: r.timestamp,
      open_price: parseFloat(r.open_price),
      high_price: parseFloat(r.high_price),
      low_price: parseFloat(r.low_price),
      close_price: parseFloat(r.close_price),
      volume: parseFloat(r.volume)
    }));
  } catch (error) {
    console.error("Lỗi lấy lịch sử:", error.message);
    throw error;
  }
}

module.exports = {
  fetchOHLCData,
  updateCandlesData,
  updateCurrentPrice,
  syncAllSymbols,
  getHistoricalCandles,
  setWebSocketBroadcasters, // Đừng quên export hàm này!
  SYMBOL_MAPPING,
  TIMEFRAME_MAPPING
};