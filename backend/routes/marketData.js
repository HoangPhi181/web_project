// backend/routes/marketData.js
// API routes for market data (OHLC, current prices, historical candles)

const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const {
  fetchOHLCData,
  updateCandlesData,
  updateCurrentPrice,
  syncAllSymbols,
  getHistoricalCandles,
  SYMBOL_MAPPING
} = require("../utils/binanceAPI");
const db = require("../db");

const router = express.Router();

// ============================================================
// API: GET /api/market/products - Get all active products with current prices
// ============================================================
router.get("/products", (req, res, next) => {
  try {
    const query = `
      SELECT
        product_id,
        symbol,
        name,
        category,
        current_price,
        is_active,
        created_at
      FROM products
      WHERE is_active = TRUE
      ORDER BY symbol ASC
    `;

    db.query(query, (err, products) => {
      if (err) {
        return next(new Error('Database error: ' + err.message));
      }

      // Format response
      const formattedProducts = products.map(product => ({
        product_id: product.product_id,
        symbol: product.symbol,
        name: product.name,
        category: product.category,
        current_price: parseFloat(product.current_price).toFixed(8),
        is_active: product.is_active,
        created_at: product.created_at
      }));

      res.json({
        message: 'Products retrieved successfully',
        count: formattedProducts.length,
        data: formattedProducts
      });
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: GET /api/market/candles/:symbol - Get historical candles for charts
// ============================================================
router.get("/candles/:symbol", (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1m', limit = 100 } = req.query;

    // Validate symbol
    if (!SYMBOL_MAPPING[symbol]) {
      return res.status(400).json({
        message: 'Invalid symbol',
        supported_symbols: Object.keys(SYMBOL_MAPPING)
      });
    }

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        message: 'Invalid timeframe',
        supported_timeframes: validTimeframes
      });
    }

    // Validate limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        message: 'Limit must be between 1 and 1000'
      });
    }

    getHistoricalCandles(symbol, timeframe, limitNum)
      .then(candles => {
        res.json({
          message: 'Candles retrieved successfully',
          symbol: symbol,
          timeframe: timeframe,
          count: candles.length,
          data: candles
        });
      })
      .catch(error => {
        next(error);
      });

  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: POST /api/market/sync - Manual sync OHLC data from Binance (Admin only)
// ============================================================
router.post("/sync", verifyToken, (req, res, next) => {
  try {
    // TODO: Add admin role check here
    // For now, allow any authenticated user

    syncAllSymbols()
      .then(() => {
        res.json({
          message: 'Market data sync completed successfully',
          timestamp: new Date().toISOString()
        });
      })
      .catch(error => {
        next(error);
      });

  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: GET /api/market/current-price/:symbol - Get current price for a symbol
// ============================================================
router.get("/current-price/:symbol", (req, res, next) => {
  try {
    const { symbol } = req.params;

    // Validate symbol
    if (!SYMBOL_MAPPING[symbol]) {
      return res.status(400).json({
        message: 'Invalid symbol',
        supported_symbols: Object.keys(SYMBOL_MAPPING)
      });
    }

    const query = `
      SELECT current_price, symbol, name, updated_at
      FROM products
      WHERE symbol = ? AND is_active = TRUE
    `;

    db.query(query, [symbol], (err, results) => {
      if (err) {
        return next(new Error('Database error: ' + err.message));
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const product = results[0];
      res.json({
        message: 'Current price retrieved',
        symbol: product.symbol,
        name: product.name,
        current_price: parseFloat(product.current_price).toFixed(8),
        updated_at: product.updated_at,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================
// API: POST /api/market/fetch-ohlc/:symbol - Fetch fresh OHLC data from Binance
// ============================================================
router.post("/fetch-ohlc/:symbol", verifyToken, (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1m', limit = 100 } = req.body;

    // Validate symbol
    if (!SYMBOL_MAPPING[symbol]) {
      return res.status(400).json({
        message: 'Invalid symbol',
        supported_symbols: Object.keys(SYMBOL_MAPPING)
      });
    }

    fetchOHLCData(symbol, timeframe, limit)
      .then(async (ohlcData) => {
        // Update candles table
        await updateCandlesData(symbol, timeframe, ohlcData);

        // Update current price
        const currentPrice = await updateCurrentPrice(symbol, timeframe);

        res.json({
          message: 'OHLC data fetched and updated successfully',
          symbol: symbol,
          timeframe: timeframe,
          candles_count: ohlcData.length,
          current_price: currentPrice ? parseFloat(currentPrice).toFixed(8) : null,
          latest_candle: ohlcData[ohlcData.length - 1] // Most recent candle
        });
      })
      .catch(error => {
        next(error);
      });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
