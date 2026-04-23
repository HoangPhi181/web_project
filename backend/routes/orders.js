// backend/routes/orders.js
// Complete implementation of 4 Orders APIs

const express = require("express");
const db = require("../db");
const verifyToken = require("../middleware/authMiddleware");
const {
  calculateRequiredMargin,
  calculatePnL,
  calculatePnLPercent,
  validatePriceDeviation,
  formatDecimal
} = require("../utils/calculations");
const {
  validateOrderCreate,
  validateCloseOrder,
  validatePagination
} = require("../utils/validators");
const {
  ValidationError,
  InsufficientBalanceError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
} = require("../utils/errors");

const router = express.Router();

// ============================================================
// API 1: POST /api/orders/create - Tạo lệnh BUY/SELL
// ============================================================
router.post("/create", verifyToken, (req, res, next) => {
  try {
    const validated = validateOrderCreate(req.body);
    const userId = req.userId;

    // 2. GET USER ACCOUNT
    const accountQuery = `SELECT account_id, balance, used_margin, leverage FROM accounts WHERE user_id = ?`;

    db.query(accountQuery, [userId], (err, accountResults) => {
      if (err) return next(new Error("Database error: " + err.message));
      if (!accountResults?.length) return next(new NotFoundError("Account"));

      const account = accountResults[0];

      // 3. GET PRODUCT INFO
      const productQuery = `SELECT product_id, symbol, current_price, is_active FROM products WHERE product_id = ?`;

      db.query(productQuery, [validated.product_id], (err, productResults) => {
        if (err) return next(new Error("Database error: " + err.message));
        if (!productResults?.length || !productResults[0].is_active) return next(new NotFoundError("Product"));

        const product = productResults[0];
        const openPrice = parseFloat(product.current_price || 0);

        // 4. VALIDATE PRICE LOGIC (Hỗ trợ NULL)
        const errors = {};
        const sl = validated.stop_loss !== null ? parseFloat(validated.stop_loss) : null;
        const tp = validated.take_profit !== null ? parseFloat(validated.take_profit) : null;

        if (validated.side === 'BUY') {
          if (sl !== null && sl >= openPrice) errors.stop_loss = 'For BUY: SL must be < open price';
          if (tp !== null && tp <= openPrice) errors.take_profit = 'For BUY: TP must be > open price';
        } else { // SELL
          if (sl !== null && sl <= openPrice) errors.stop_loss = 'For SELL: SL must be > open price';
          if (tp !== null && tp >= openPrice) errors.take_profit = 'For SELL: TP must be < open price';
        }

        if (Object.keys(errors).length > 0) {
          return next(new ValidationError('Price validation failed', errors));
        }

        // 5. CALCULATE MARGIN
        const requiredMargin = calculateRequiredMargin(openPrice, validated.volume, account.leverage);
        const totalUsedMargin = parseFloat(account.used_margin) + requiredMargin;

        if (parseFloat(account.balance) < totalUsedMargin) {
          return next(new InsufficientBalanceError(formatDecimal(totalUsedMargin), formatDecimal(account.balance)));
        }

        // 6. START TRANSACTION
        db.query('START TRANSACTION', (err) => {
          if (err) return next(new Error('Transaction error: ' + err.message));

          const updateAccountQuery = `UPDATE accounts SET used_margin = used_margin + ? WHERE account_id = ?`;
          db.query(updateAccountQuery, [requiredMargin, account.account_id], (err) => {
            if (err) {
              db.query('ROLLBACK');
              return next(new Error('Update account error: ' + err.message));
            }

            const insertOrderQuery = `
              INSERT INTO orders (account_id, product_id, side, volume, open_price, stop_loss, take_profit, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
            `;

            db.query(
              insertOrderQuery,
              [account.account_id, validated.product_id, validated.side, validated.volume, openPrice, sl, tp],
              (err, result) => {
                if (err) {
                  db.query('ROLLBACK');
                  return next(new Error('Insert order error: ' + err.message));
                }

                db.query('COMMIT', (err) => {
                  if (err) {
                    db.query('ROLLBACK');
                    return next(new Error('Commit error: ' + err.message));
                  }

                  res.status(201).json({
                    message: 'Order created successfully',
                    order_id: result.insertId,
                    open_price: openPrice,
                    symbol: product.symbol,
                    status: 'OPEN',
                    required_margin: formatDecimal(requiredMargin)
                  });
                });
              }
            );
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
});
// ============================================================
// API 2: GET /api/orders - Danh sách lệnh đang mở
// ============================================================
router.get("/opening", verifyToken, (req, res, next) => {
  try {
    const userId = req.userId;

    const query = `
      SELECT
        o.order_id, o.account_id, o.product_id,
        p.symbol, p.name, p.current_price,
        o.side, o.volume, o.open_price,
        o.stop_loss, o.take_profit,
        o.status, o.opened_at
      FROM orders o
      JOIN products p ON o.product_id = p.product_id
      JOIN accounts a ON o.account_id = a.account_id
      WHERE a.user_id = ? AND o.status = 'OPEN'
      ORDER BY o.opened_at DESC
    `;

    db.query(query, [userId], (err, orders) => {
      if (err) {
        return next(new Error('Database error: ' + err.message));
      }

      // Calculate P&L for each order
      const ordersWithPnL = orders.map(order => {
        const currentPrice = parseFloat(order.current_price) || 0;
        const openPrice = parseFloat(order.open_price);
        const volume = parseFloat(order.volume);

        const pnl = calculatePnL(openPrice, currentPrice, volume, order.side);
        const pnlPercent = calculatePnLPercent(openPrice, currentPrice, volume, order.side);

        return {
          order_id: order.order_id,
          product_id: order.product_id,
          symbol: order.symbol,
          name: order.name,
          side: order.side,
          volume: formatDecimal(order.volume),
          open_price: formatDecimal(openPrice),
          current_price: formatDecimal(currentPrice),
          stop_loss: formatDecimal(order.stop_loss),
          take_profit: formatDecimal(order.take_profit),
          pnl: formatDecimal(pnl),
          pnl_percent: pnlPercent.toFixed(2),
          status: order.status,
          opened_at: order.opened_at
        };
      });

      res.json({
        message: 'Orders retrieved successfully',
        count: ordersWithPnL.length,
        data: ordersWithPnL
      });
    });
  } catch (error) {
    next(error);
  }
});
/*-------------------------------------------------------------------*/
router.get("/balance", verifyToken, (req, res) => {
    try {
        const userId = req.userId;

        const query = `
            SELECT 
                a.account_id,
                a.balance,

                COALESCE(SUM(
                    CASE 
                        WHEN o.side = 'BUY' THEN (IFNULL(p.current_price,0) - o.open_price) * o.volume
                        WHEN o.side = 'SELL' THEN (o.open_price - IFNULL(p.current_price,0)) * o.volume
                        ELSE 0
                    END
                ), 0) AS floating_pnl,

                a.balance + COALESCE(SUM(
                    CASE 
                        WHEN o.side = 'BUY' THEN (IFNULL(p.current_price,0) - o.open_price) * o.volume
                        WHEN o.side = 'SELL' THEN (o.open_price - IFNULL(p.current_price,0)) * o.volume
                        ELSE 0
                    END
                ), 0) AS equity

            FROM accounts a

            LEFT JOIN orders o 
                ON a.account_id = o.account_id 
                AND o.status = 'OPEN'

            LEFT JOIN products p 
                ON o.product_id = p.product_id

            WHERE a.user_id = ?

            GROUP BY a.account_id
        `;

        db.query(query, [userId], (err, rows) => {
            if (err) {
                console.error("🔥 BALANCE ERROR:", err);

                return res.status(500).json({
                    message: "Lỗi server",
                    error: err.message,
                    sql: err.sqlMessage
                });
            }

            res.json({
                success: true,
                data: rows
            });
        });

    } catch (err) {
        console.error("🔥 CATCH ERROR:", err);

        res.status(500).json({
            message: "Lỗi server",
            error: err.message
        });
    }
});
// ============================================================
// API 3: POST /api/orders/{id}/close - Đóng lệnh
// ============================================================
router.post("/:id/close", verifyToken, (req, res, next) => {
  try {
    // 1. VALIDATE INPUT
    const validated = validateCloseOrder(req.body);
    const orderId = parseInt(req.params.id);
    const userId = req.userId;
    const closePrice = parseFloat(validated.close_price);

    if (isNaN(orderId) || orderId <= 0) {
      return next(new ValidationError('Invalid order ID'));
    }

    // 2. GET ORDER WITH ACCOUNT CHECK
    const orderQuery = `
      SELECT
        o.order_id, o.account_id, o.product_id,
        o.side, o.volume, o.open_price,
        o.stop_loss, o.take_profit, o.status,
        a.user_id, a.leverage
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      WHERE o.order_id = ?
    `;

    db.query(orderQuery, [orderId], (err, orderResults) => {
      if (err) {
        return next(new Error('Database error: ' + err.message));
      }

      if (!orderResults || orderResults.length === 0) {
        return next(new NotFoundError('Order'));
      }

      const order = orderResults[0];

      // 3. VERIFY USER OWNERSHIP
      if (order.user_id !== userId) {
        return next(new UnauthorizedError('You do not own this order'));
      }

      // 4. CHECK IF ORDER IS OPEN
      if (order.status !== 'OPEN') {
        return next(new ConflictError('Order is not open'));
      }

      // 5. GET PRODUCT INFO FOR VALIDATION
      const productQuery = `
        SELECT current_price FROM products WHERE product_id = ?
      `;

      db.query(productQuery, [order.product_id], (err, productResults) => {
        if (err) {
          return next(new Error('Database error: ' + err.message));
        }

        const currentPrice = parseFloat(productResults[0]?.current_price || order.open_price);

        // 6. VALIDATE CLOSE PRICE (±10% tolerance)
        const priceCheck = validatePriceDeviation(order.open_price, closePrice, 10);
        if (!priceCheck.isValid) {
          console.warn(`Price deviation warning: ${priceCheck.deviation}% (allowed: ${priceCheck.allowedDeviation}%)`);
          // Note: We allow it to proceed but log warning
        }

        // 7. CALCULATE P&L
        const pnl = calculatePnL(order.open_price, closePrice, order.volume, order.side);
        const requiredMargin = calculateRequiredMargin(
          order.open_price,
          order.volume,
          order.leverage
        );

        // 8. CLOSE ORDER - START TRANSACTION
        db.query('START TRANSACTION', (err) => {
          if (err) {
            return next(new Error('Transaction error: ' + err.message));
          }

          // Update order - set status to CLOSED
          const updateOrderQuery = `
            UPDATE orders
            SET
              status = 'CLOSED',
              close_price = ?,
              closed_at = NOW(),
              profit_loss = ?
            WHERE order_id = ?
          `;

          db.query(updateOrderQuery, [closePrice, pnl, orderId], (err) => {
            if (err) {
              db.query('ROLLBACK');
              return next(new Error('Update order error: ' + err.message));
            }

            // Update account - release margin & update balance
            const updateAccountQuery = `
              UPDATE accounts
              SET
                used_margin = used_margin - ?,
                balance = balance + ?
              WHERE account_id = ?
            `;

            db.query(
              updateAccountQuery,
              [requiredMargin, pnl, order.account_id],
              (err) => {
                if (err) {
                  db.query('ROLLBACK');
                  return next(new Error('Update account error: ' + err.message));
                }

                // Commit transaction
                db.query('COMMIT', (err) => {
                  if (err) {
                    db.query('ROLLBACK');
                    return next(new Error('Commit error: ' + err.message));
                  }

                  const pnlPercent = calculatePnLPercent(order.open_price, closePrice, order.volume, order.side);

                  res.json({
                    message: 'Order closed successfully',
                    order_id: orderId,
                    open_price: formatDecimal(order.open_price),
                    close_price: formatDecimal(closePrice),
                    volume: formatDecimal(order.volume),
                    pnl: formatDecimal(pnl),
                    pnl_percent: pnlPercent.toFixed(2),
                    status: 'CLOSED',
                    closed_at: new Date().toISOString()
                  });
                });
              }
            );
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// API 4: GET /api/orders/history - Lịch sử giao dịch
// ============================================================
router.get("/history/list", verifyToken, (req, res, next) => {
  try {
    // Validate pagination
    const { limit, page, offset } = validatePagination(req.query);
    const userId = req.userId;

    // Query 1: Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN accounts a ON o.account_id = a.account_id
      WHERE a.user_id = ? AND o.status = 'CLOSED'
    `;

    db.query(countQuery, [userId], (err, countResults) => {
      if (err) {
        return next(new Error('Database error: ' + err.message));
      }

      const total = countResults[0].total;

      // Query 2: Get history data with pagination
      const historyQuery = `
        SELECT
          o.order_id, o.product_id,
          p.symbol, p.name,
          o.side, o.volume,
          o.open_price, o.close_price,
          o.status, o.opened_at, o.closed_at,
          o.profit_loss
        FROM orders o
        JOIN products p ON o.product_id = p.product_id
        JOIN accounts a ON o.account_id = a.account_id
        WHERE a.user_id = ? AND o.status = 'CLOSED'
        ORDER BY o.closed_at DESC
        LIMIT ? OFFSET ?
      `;

      db.query(historyQuery, [userId, limit, offset], (err, orders) => {
        if (err) {
          return next(new Error('Database error: ' + err.message));
        }

        // Format response
        const formattedOrders = orders.map(order => {
          const openedAt = new Date(order.opened_at);
          const closedAt = new Date(order.closed_at);
          const durationMinutes = Math.round((closedAt - openedAt) / (1000 * 60));

          const pnlPercent = calculatePnLPercent(
            order.open_price,
            order.close_price,
            order.volume,
            order.side
          );

          return {
            order_id: order.order_id,
            symbol: order.symbol,
            name: order.name,
            side: order.side,
            volume: formatDecimal(order.volume),
            open_price: formatDecimal(order.open_price),
            close_price: formatDecimal(order.close_price),
            pnl: formatDecimal(order.profit_loss || 0),
            pnl_percent: pnlPercent.toFixed(2),
            status: order.status,
            opened_at: order.opened_at,
            closed_at: order.closed_at,
            duration_minutes: durationMinutes
          };
        });

        res.json({
          message: 'Order history retrieved successfully',
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          },
          data: formattedOrders
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;