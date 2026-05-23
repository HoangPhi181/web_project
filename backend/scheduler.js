// backend/scheduler.js

const { syncAllSymbols } = require('./utils/binanceAPI');
const { transaction }    = require('./mediators/Helpers');
const db                 = require('./db');

let syncInterval   = null;
let slTpInterval   = null;
let isRunning      = false;

const SYNC_INTERVAL_SECONDS = 1;
const SLTP_INTERVAL_MS      = 1000; // kiểm tra SL/TP mỗi 1 giây

// ── OHLC Sync ────────────────────────────────────────────────

function startScheduler() {
  if (isRunning) {
    console.log('Scheduler is already running');
    return;
  }

  console.log(`Starting OHLC data scheduler (every ${SYNC_INTERVAL_SECONDS} seconds)`);
  isRunning = true;

  syncAllSymbols().catch(err => console.error('Initial sync failed:', err.message));

  syncInterval = setInterval(async () => {
    try {
      await syncAllSymbols();
    } catch (err) {
      console.error('Scheduled sync failed:', err.message);
    }
  }, SYNC_INTERVAL_SECONDS * 1000);

  // Khởi động job kiểm tra SL/TP
  startSLTPChecker();
}

function stopScheduler() {
  if (!isRunning) return;
  console.log('Stopping OHLC data scheduler');
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  if (slTpInterval) { clearInterval(slTpInterval); slTpInterval = null; }
  isRunning = false;
}

function getSchedulerStatus() {
  return {
    isRunning,
    intervalSeconds: SYNC_INTERVAL_SECONDS,
    nextSyncIn: isRunning ? `${SYNC_INTERVAL_SECONDS} second(s)` : 'N/A'
  };
}

async function manualSync() {
  try {
    await syncAllSymbols();
    return { success: true, message: 'Manual sync completed' };
  } catch (err) {
    console.error('Manual sync failed:', err.message);
    throw err;
  }
}

// ── SL/TP Auto-Close ─────────────────────────────────────────

function startSLTPChecker() {
  console.log(`🔍 Starting SL/TP checker (every ${SLTP_INTERVAL_MS / 1000}s)`);
  slTpInterval = setInterval(checkAndCloseSLTP, SLTP_INTERVAL_MS);
}

async function checkAndCloseSLTP() {
  try {
    // Lấy tất cả lệnh OPEN có SL hoặc TP, kèm giá hiện tại
    const [rows] = await db.promise().query(`
      SELECT
        o.order_id,
        o.side,
        o.volume,
        o.open_price,
        o.stop_loss,
        o.take_profit,
        o.account_id,
        p.current_price,
        p.symbol,
        a.leverage
      FROM orders o
      JOIN products p ON o.product_id = p.product_id
      JOIN accounts a ON o.account_id = a.account_id
      WHERE o.status = 'OPEN'
        AND (o.stop_loss IS NOT NULL OR o.take_profit IS NOT NULL)
    `);

    for (const order of rows) {
      const price     = parseFloat(order.current_price);
      const sl        = order.stop_loss   != null ? parseFloat(order.stop_loss)   : null;
      const tp        = order.take_profit != null ? parseFloat(order.take_profit) : null;
      const side      = order.side;

      let hit    = false;
      let reason = '';

      if (side === 'BUY') {
        // BUY: giá xuống chạm SL → cắt lỗ
        if (sl !== null && price <= sl) { hit = true; reason = 'SL'; }
        // BUY: giá lên chạm TP → chốt lời
        if (tp !== null && price >= tp) { hit = true; reason = 'TP'; }
      } else if (side === 'SELL') {
        // SELL: giá lên chạm SL → cắt lỗ
        if (sl !== null && price >= sl) { hit = true; reason = 'SL'; }
        // SELL: giá xuống chạm TP → chốt lời
        if (tp !== null && price <= tp) { hit = true; reason = 'TP'; }
      }

      if (hit) {
        await autoCloseOrder(order, price, reason);
      }
    }
  } catch (err) {
    console.error('❌ SL/TP checker error:', err.message);
  }
}

async function autoCloseOrder(order, closePrice, reason) {
  try {
    await transaction(async (run) => {
      // Lock lệnh, kiểm tra vẫn OPEN
      const [locked] = await run(
        `SELECT order_id FROM orders WHERE order_id = ? AND status = 'OPEN' FOR UPDATE`,
        [order.order_id]
      );
      if (!locked) return; 

      const leverage  = order.leverage || 100;
      const openPrice = parseFloat(order.open_price);
      const volume    = parseFloat(order.volume);

      const pnl = order.side === 'BUY'
        ? (closePrice - openPrice) * volume
        : (openPrice - closePrice) * volume;

      const margin = (openPrice * volume) / leverage;

      await run(
        `UPDATE accounts
         SET balance = balance + ?,
             used_margin = GREATEST(used_margin - ?, 0)
         WHERE account_id = ?`,
        [pnl, margin, order.account_id]
      );

      await run(
        `UPDATE orders
         SET status = 'CLOSED',
             close_price = ?,
             profit_loss = ?,
             closed_at   = NOW()
         WHERE order_id = ?`,
        [closePrice, pnl, order.order_id]
      );
    });

    console.log(
      `✅ Auto-closed order #${order.order_id} | ${order.side} ${order.symbol}` +
      ` | Reason: ${reason} | Price: ${closePrice} | PnL: ${
        (order.side === 'BUY'
          ? (closePrice - parseFloat(order.open_price))
          : (parseFloat(order.open_price) - closePrice)
        * parseFloat(order.volume)).toFixed(2)
      }`
    );
  } catch (err) {
    console.error(`❌ Failed to auto-close order #${order.order_id}:`, err.message);
  }
}

// Graceful shutdown
process.on('SIGINT',  () => { stopScheduler(); process.exit(0); });
process.on('SIGTERM', () => { stopScheduler(); process.exit(0); });

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  manualSync,
  checkAndCloseSLTP,
};