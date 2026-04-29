// backend/mediators/CentralMediator.js
// Central communication hub using Mediator Pattern
// Decouples routes from database logic

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const {
  calculateRequiredMargin,
  calculatePnL,
  calculatePnLPercent,
  formatDecimal
} = require("../utils/calculations");
const {
  ValidationError,
  InsufficientBalanceError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
} = require("../utils/errors");

class CentralMediator {
  // ============================================================
  // AUTH MODULE
  // ============================================================

  static async registerUser(username, email, password, country = null) {
    return new Promise((resolve, reject) => {
      if (!password || password.length < 8) {
        return reject(new ValidationError("Password must be at least 8 characters"));
      }

      const checkUserSql = "SELECT user_id FROM users WHERE username = ? OR email = ?";
      db.query(checkUserSql, [username, email], async (checkErr, checkResults) => {
        if (checkErr) {
          return reject(new Error("Database error: " + checkErr.message));
        }

        if (checkResults.length > 0) {
          return reject(new ConflictError("Username or email already exists"));
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.query('START TRANSACTION', async (err) => {
            if (err) {
              return reject(new Error('Transaction error: ' + err.message));
            }

            const sql = "INSERT INTO users (username, email, country, password_hash, role) VALUES (?, ?, ?, ?, 'user')";
            db.query(sql, [username, email, country, hashedPassword], (err, result) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error("Database error: " + err.message));
              }

              const userId = result.insertId;
              const createAccountSql = "INSERT INTO accounts (user_id, balance, used_margin, leverage) VALUES (?, ?, ?, ?)";

              db.query(createAccountSql, [userId, 10000, 0, 100], (accountErr) => {
                if (accountErr) {
                  db.query('ROLLBACK');
                  return reject(new Error("Database error: " + accountErr.message));
                }

                db.query('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.query('ROLLBACK');
                    return reject(new Error('Commit error: ' + commitErr.message));
                  }

                  resolve({
                    message: "Register success",
                    userId: userId
                  });
                });
              });
            });
          });
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  static async loginUser(email, password) {
    return new Promise((resolve, reject) => {
      const sql = "SELECT user_id, username, email, role, password_hash FROM users WHERE email = ?";

      db.query(sql, [email], async (err, results) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (results.length === 0) {
          return reject(new UnauthorizedError("User not found"));
        }

        const user = results[0];

        try {
          const validPassword = await bcrypt.compare(password, user.password_hash);

          if (!validPassword) {
            return reject(new UnauthorizedError("Wrong password"));
          }

          // Updated JWT to include role and id
          const token = jwt.sign(
            { id: user.user_id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );

          resolve({
            message: "Login success",
            token: token,
            user: {
              id: user.user_id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // ============================================================
  // TRADING MODULE
  // ============================================================

  static createOrder(userId, productId, side, volume, stopLoss, takeProfit) {
    return new Promise((resolve, reject) => {
      const accountQuery = `
        SELECT a.account_id, a.balance, a.used_margin, a.leverage
        FROM accounts a
        WHERE a.user_id = ?
      `;

      db.query(accountQuery, [userId], (err, accountResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!accountResults || accountResults.length === 0) {
          return reject(new NotFoundError("Account"));
        }

        const account = accountResults[0];
        const productQuery = `
          SELECT product_id, symbol, current_price, is_active
          FROM products
          WHERE product_id = ?
        `;

        db.query(productQuery, [productId], (err, productResults) => {
          if (err) {
            return reject(new Error("Database error: " + err.message));
          }

          if (!productResults || productResults.length === 0 || !productResults[0].is_active) {
            return reject(new NotFoundError("Product"));
          }

          const product = productResults[0];
          const currentPrice = parseFloat(product.current_price);
          const openPrice = parseFloat(currentPrice);
          const vol = parseFloat(volume);
          const sl = stopLoss !== null && stopLoss !== undefined ? parseFloat(stopLoss) : null;
          const tp = takeProfit !== null && takeProfit !== undefined ? parseFloat(takeProfit) : null;
          const errors = {};

          if (isNaN(openPrice) || openPrice <= 0) {
            return reject(new ValidationError('Validation failed', { product_id: 'Invalid product price' }));
          }

          if (isNaN(vol) || vol <= 0) {
            return reject(new ValidationError('Validation failed', { volume: 'Volume must be greater than 0' }));
          }

          if (sl !== null) {
            if (isNaN(sl) || sl <= 0) {
              errors.stop_loss = 'Stop loss must be greater than 0';
            } else if (side === 'BUY' && sl >= openPrice) {
              errors.stop_loss = 'For BUY: stop_loss must be < open_price';
            } else if (side === 'SELL' && sl <= openPrice) {
              errors.stop_loss = 'For SELL: stop_loss must be > open_price';
            }
          }

          if (tp !== null) {
            if (isNaN(tp) || tp <= 0) {
              errors.take_profit = 'Take profit must be greater than 0';
            } else if (side === 'BUY' && tp <= openPrice) {
              errors.take_profit = 'For BUY: take_profit must be > open_price';
            } else if (side === 'SELL' && tp >= openPrice) {
              errors.take_profit = 'For SELL: take_profit must be < open_price';
            }
          }

          if (Object.keys(errors).length > 0) {
            return reject(new ValidationError('Price validation failed', errors));
          }

          const requiredMargin = calculateRequiredMargin(openPrice, vol, account.leverage);
          const availableBalance = parseFloat(account.balance);

          if (availableBalance < requiredMargin) {
            return reject(
              new InsufficientBalanceError(
                formatDecimal(requiredMargin),
                formatDecimal(availableBalance)
              )
            );
          }

          db.query('START TRANSACTION', (err) => {
            if (err) {
              return reject(new Error('Transaction error: ' + err.message));
            }

            const updateAccountQuery = `
              UPDATE accounts
              SET
                used_margin = used_margin + ?,
                balance = balance - ?
              WHERE account_id = ?
            `;

            db.query(updateAccountQuery, [requiredMargin, requiredMargin, account.account_id], (err) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error('Update account error: ' + err.message));
              }

              const insertOrderQuery = `
                INSERT INTO orders (
                  account_id, product_id, side, volume,
                  open_price, stop_loss, take_profit, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
              `;

              db.query(
                insertOrderQuery,
                [
                  account.account_id,
                  productId,
                  side,
                  vol,
                  openPrice,
                  sl,
                  tp
                ],
                (err, result) => {
                  if (err) {
                    db.query('ROLLBACK');
                    return reject(new Error('Insert order error: ' + err.message));
                  }

                  db.query('COMMIT', (err) => {
                    if (err) {
                      db.query('ROLLBACK');
                      return reject(new Error('Commit error: ' + err.message));
                    }

                    resolve({
                      message: 'Order created successfully',
                      order_id: result.insertId,
                      open_price: formatDecimal(openPrice),
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
    });
  }

  static closeOrder(userId, orderId, closePrice) {
    return new Promise((resolve, reject) => {
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
          return reject(new Error('Database error: ' + err.message));
        }

        if (!orderResults || orderResults.length === 0) {
          return reject(new NotFoundError('Order'));
        }

        const order = orderResults[0];

        if (order.user_id !== userId) {
          return reject(new UnauthorizedError('You do not own this order'));
        }

        if (order.status !== 'OPEN') {
          return reject(new ConflictError('Order is not open'));
        }

        const closePriceNum = parseFloat(closePrice);
        if (isNaN(closePriceNum) || closePriceNum <= 0) {
          return reject(new ValidationError('Validation failed', { close_price: 'Close price must be a valid number' }));
        }

        const openPrice = parseFloat(order.open_price);
        const volume = parseFloat(order.volume);

        const pnl = calculatePnL(openPrice, closePriceNum, volume, order.side);
        const requiredMargin = calculateRequiredMargin(openPrice, volume, order.leverage);

        db.query('START TRANSACTION', (err) => {
          if (err) {
            return reject(new Error('Transaction error: ' + err.message));
          }

          const updateOrderQuery = `
            UPDATE orders
            SET status = 'CLOSED', close_price = ?, profit_loss = ?, closed_at = NOW()
            WHERE order_id = ?
          `;

          db.query(updateOrderQuery, [closePriceNum, pnl, orderId], (err) => {
            if (err) {
              db.query('ROLLBACK');
              return reject(new Error('Update order error: ' + err.message));
            }

            const updateAccountQuery = `
              UPDATE accounts
              SET balance = balance + ?, used_margin = GREATEST(used_margin - ?, 0)
              WHERE account_id = ?
            `;

            db.query(updateAccountQuery, [pnl + requiredMargin, requiredMargin, order.account_id], (err) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error('Update account error: ' + err.message));
              }

              db.query('COMMIT', (err) => {
                if (err) {
                  db.query('ROLLBACK');
                  return reject(new Error('Commit error: ' + err.message));
                }

                resolve({
                  message: 'Order closed successfully',
                  order_id: orderId,
                  close_price: formatDecimal(closePriceNum),
                  profit_loss: formatDecimal(pnl),
                  pnl_percent: calculatePnLPercent(openPrice, closePriceNum, volume, order.side).toFixed(2),
                  status: 'CLOSED'
                });
              });
            });
          });
        });
      });
    });
  }

  static getOpenOrders(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          o.order_id, o.product_id, o.side, o.volume,
          o.open_price, o.stop_loss, o.take_profit,
          o.status, o.opened_at,
          p.symbol, p.name, p.current_price
        FROM orders o
        JOIN products p ON o.product_id = p.product_id
        JOIN accounts a ON o.account_id = a.account_id
        WHERE a.user_id = ? AND o.status = 'OPEN'
        ORDER BY o.opened_at DESC
      `;

      db.query(query, [userId], (err, orders) => {
        if (err) {
          return reject(new Error('Database error: ' + err.message));
        }

        const formattedOrders = orders.map(order => {
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
            volume: formatDecimal(volume),
            open_price: formatDecimal(openPrice),
            current_price: formatDecimal(currentPrice),
            stop_loss: order.stop_loss !== null ? formatDecimal(order.stop_loss) : null,
            take_profit: order.take_profit !== null ? formatDecimal(order.take_profit) : null,
            pnl: formatDecimal(pnl),
            pnl_percent: pnlPercent.toFixed(2),
            status: order.status,
            opened_at: order.opened_at
          };
        });

        resolve({
          message: 'Open orders retrieved successfully',
          count: formattedOrders.length,
          data: formattedOrders
        });
      });
    });
  }

  static getOrderHistory(userId, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM orders o
        JOIN accounts a ON o.account_id = a.account_id
        WHERE a.user_id = ? AND o.status = 'CLOSED'
      `;

      db.query(countQuery, [userId], (err, countResults) => {
        if (err) {
          return reject(new Error('Database error: ' + err.message));
        }

        const total = countResults[0]?.total || 0;
        const historyQuery = `
          SELECT
            o.order_id, o.product_id, o.side, o.volume,
            o.open_price, o.close_price, o.profit_loss,
            o.status, o.opened_at, o.closed_at,
            p.symbol, p.name
          FROM orders o
          JOIN products p ON o.product_id = p.product_id
          JOIN accounts a ON o.account_id = a.account_id
          WHERE a.user_id = ? AND o.status = 'CLOSED'
          ORDER BY o.closed_at DESC
          LIMIT ? OFFSET ?
        `;

        db.query(historyQuery, [userId, limit, offset], (err, orders) => {
          if (err) {
            return reject(new Error('Database error: ' + err.message));
          }

          const formattedOrders = orders.map(order => {
            const pnlPercent = calculatePnLPercent(
              parseFloat(order.open_price),
              parseFloat(order.close_price),
              parseFloat(order.volume),
              order.side
            );

            const openedAt = order.opened_at;
            const closedAt = order.closed_at;
            const durationMinutes = openedAt && closedAt
              ? Math.round((new Date(closedAt) - new Date(openedAt)) / (1000 * 60))
              : null;

            return {
              order_id: order.order_id,
              product_id: order.product_id,
              symbol: order.symbol,
              name: order.name,
              side: order.side,
              volume: formatDecimal(order.volume),
              open_price: formatDecimal(order.open_price),
              close_price: formatDecimal(order.close_price),
              pnl: formatDecimal(order.profit_loss || 0),
              pnl_percent: pnlPercent.toFixed(2),
              status: order.status,
              opened_at: openedAt,
              closed_at: closedAt,
              duration_minutes: durationMinutes
            };
          });

          resolve({
            message: 'Order history retrieved successfully',
            pagination: {
              total,
              limit,
              offset,
              pages: Math.ceil(total / limit)
            },
            data: formattedOrders
          });
        });
      });
    });
  }

  // ============================================================
  // TRANSACTION MODULE
  // ============================================================

  static sendWithdrawCode(userId) {
    return new Promise((resolve, reject) => {
      // Generate 6-digit code
      const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Get user email for sending code
      const userQuery = "SELECT user_id, email FROM users WHERE user_id = ?";

      db.query(userQuery, [userId], (err, userResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!userResults || userResults.length === 0) {
          return reject(new NotFoundError("User"));
        }

        const user = userResults[0];

        // Store verify code in database (expires in 10 minutes)
        const updateQuery = "UPDATE users SET verify_code = ?, verify_code_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE user_id = ?";

        db.query(updateQuery, [verifyCode, userId], (err) => {
          if (err) {
            return reject(new Error("Database error: " + err.message));
          }

          // In production, send code via email
          // For now, just log it
          console.log(`[DEMO] Withdraw verification code for ${user.email}: ${verifyCode}`);

          resolve({
            message: "Verification code sent",
            // In production, don't return code to frontend
            code: process.env.NODE_ENV === 'development' ? verifyCode : undefined
          });
        });
      });
    });
  }

  static processWithdraw(userId, amount, verifyCode) {
    return new Promise((resolve, reject) => {
      // Verify code and get user
      const userQuery = "SELECT user_id, verify_code, verify_code_expires FROM users WHERE user_id = ? AND verify_code = ?";

      db.query(userQuery, [userId, verifyCode], (err, userResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!userResults || userResults.length === 0) {
          return reject(new ValidationError("Invalid verification code"));
        }

        const user = userResults[0];

        // Check if code is expired
        if (new Date() > new Date(user.verify_code_expires)) {
          return reject(new ValidationError("Verification code expired"));
        }

        // Get account to check balance
        const accountQuery = `
          SELECT account_id, balance, used_margin
          FROM accounts
          WHERE user_id = ?
        `;

        db.query(accountQuery, [userId], (err, accountResults) => {
          if (err) {
            return reject(new Error("Database error: " + err.message));
          }

          if (!accountResults || accountResults.length === 0) {
            return reject(new NotFoundError("Account"));
          }

          const account = accountResults[0];
          const withdrawAmount = parseFloat(amount);
          const availableBalance = parseFloat(account.balance) - parseFloat(account.used_margin);

          // Check balance
          if (availableBalance < withdrawAmount) {
            return reject(
              new InsufficientBalanceError(
                formatDecimal(withdrawAmount),
                formatDecimal(availableBalance)
              )
            );
          }

          // START TRANSACTION for withdrawal
          db.query('START TRANSACTION', (err) => {
            if (err) {
              return reject(new Error('Transaction error: ' + err.message));
            }

            // Deduct from balance
            const updateAccountQuery = `
              UPDATE accounts
              SET balance = balance - ?
              WHERE account_id = ?
            `;

            db.query(updateAccountQuery, [withdrawAmount, account.account_id], (err) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error('Update account error: ' + err.message));
              }

              // Create transaction record
              const transactionQuery = `
                INSERT INTO transactions (account_id, amount, type, status, reference_code)
                VALUES (?, ?, 'WITHDRAW', 'COMPLETED', ?)
              `;

              const referenceCode = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              db.query(transactionQuery, [account.account_id, withdrawAmount, referenceCode], (err, result) => {
                if (err) {
                  db.query('ROLLBACK');
                  return reject(new Error('Create transaction error: ' + err.message));
                }

                // Clear verify code
                const clearCodeQuery = "UPDATE users SET verify_code = NULL, verify_code_expires = NULL WHERE user_id = ?";

                db.query(clearCodeQuery, [userId], (err) => {
                  if (err) {
                    db.query('ROLLBACK');
                    return reject(new Error('Clear code error: ' + err.message));
                  }

                  // Commit transaction
                  db.query('COMMIT', (err) => {
                    if (err) {
                      db.query('ROLLBACK');
                      return reject(new Error('Commit error: ' + err.message));
                    }

                    resolve({
                      message: 'Withdrawal processed successfully',
                      amount: formatDecimal(withdrawAmount),
                      reference_code: referenceCode,
                      status: 'COMPLETED'
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  static processDeposit(userId, amount) {
    return new Promise((resolve, reject) => {
      // Get account
      const accountQuery = "SELECT account_id FROM accounts WHERE user_id = ?";

      db.query(accountQuery, [userId], (err, accountResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!accountResults || accountResults.length === 0) {
          return reject(new NotFoundError("Account"));
        }

        const account = accountResults[0];
        const depositAmount = parseFloat(amount);

        // Generate VietQR code (placeholder - in production integrate with VietQR API)
        const qrCode = `VietQR-${userId}-${Date.now()}`;

        // START TRANSACTION for deposit
        db.query('START TRANSACTION', (err) => {
          if (err) {
            return reject(new Error('Transaction error: ' + err.message));
          }

          // Create pending transaction record
          const transactionQuery = `
            INSERT INTO transactions (account_id, amount, type, status, reference_code)
            VALUES (?, ?, 'DEPOSIT', 'PENDING', ?)
          `;

          const referenceCode = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          db.query(transactionQuery, [account.account_id, depositAmount, referenceCode], (err, result) => {
            if (err) {
              db.query('ROLLBACK');
              return reject(new Error('Create transaction error: ' + err.message));
            }

            // Commit transaction
            db.query('COMMIT', (err) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error('Commit error: ' + err.message));
              }

              resolve({
                message: 'Deposit initiated - QR code generated',
                amount: formatDecimal(depositAmount),
                qr_code: qrCode,
                reference_code: referenceCode,
                status: 'PENDING',
                instructions: 'Send funds to the provided QR code. Deposit will be completed within 2-5 minutes.'
              });
            });
          });
        });
      });
    });
  }

  // ============================================================
  // ADMIN MODULE
  // ============================================================

  static getAllUsersDetailed(adminId) {
    return new Promise((resolve, reject) => {
      // Verify admin role
      const adminQuery = "SELECT role FROM users WHERE user_id = ?";

      db.query(adminQuery, [adminId], (err, adminResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!adminResults || adminResults.length === 0 || adminResults[0].role !== 'admin') {
          return reject(new UnauthorizedError('Admin access required'));
        }

        // Get all users with their accounts and orders
        const usersQuery = `
          SELECT
            u.user_id,
            u.username,
            u.email,
            u.country,
            u.role,
            u.created_at,
            a.account_id,
            a.balance,
            a.used_margin,
            a.leverage,
            COUNT(DISTINCT o.order_id) as total_orders,
            COALESCE(SUM(o.profit_loss), 0) as total_pnl
          FROM users u
          LEFT JOIN accounts a ON u.user_id = a.user_id
          LEFT JOIN orders o ON a.account_id = o.account_id AND o.status = 'CLOSED'
          GROUP BY u.user_id, a.account_id
          ORDER BY u.created_at DESC
        `;

        db.query(usersQuery, (err, results) => {
          if (err) {
            return reject(new Error("Database error: " + err.message));
          }

          // Format results
          const usersMap = {};

          results.forEach(row => {
            if (!usersMap[row.user_id]) {
              usersMap[row.user_id] = {
                user_id: row.user_id,
                username: row.username,
                email: row.email,
                country: row.country,
                role: row.role,
                created_at: row.created_at,
                accounts: []
              };
            }

            if (row.account_id) {
              usersMap[row.user_id].accounts.push({
                account_id: row.account_id,
                balance: formatDecimal(row.balance),
                used_margin: formatDecimal(row.used_margin),
                leverage: row.leverage,
                total_orders: row.total_orders,
                total_pnl: formatDecimal(row.total_pnl)
              });
            }
          });

          const usersList = Object.values(usersMap);

          resolve({
            message: 'Users retrieved successfully',
            count: usersList.length,
            data: usersList
          });
        });
      });
    });
  }

  static updateSystemSettings(adminId, settings) {
    return new Promise((resolve, reject) => {
      // Verify admin role
      const adminQuery = "SELECT role FROM users WHERE user_id = ?";

      db.query(adminQuery, [adminId], (err, adminResults) => {
        if (err) {
          return reject(new Error("Database error: " + err.message));
        }

        if (!adminResults || adminResults.length === 0 || adminResults[0].role !== 'admin') {
          return reject(new UnauthorizedError('Admin access required'));
        }

        // In production, store settings in a settings table
        // For now, just validate and return
        resolve({
          message: 'System settings updated successfully',
          updated_at: new Date().toISOString()
        });
      });
    });
  }
}

module.exports = CentralMediator;
