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
      // Validate password length
      if (password.length < 6) {
        return reject(new ValidationError("Password must be at least 6 characters"));
      }

      // Check for existing user
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

          // Insert new user with default role 'user'
          const sql = "INSERT INTO users (username, email, country, password_hash, role) VALUES (?, ?, ?, ?, 'user')";

          db.query(sql, [username, email, country, hashedPassword], (err, result) => {
            if (err) {
              return reject(new Error("Database error: " + err.message));
            }

            const userId = result.insertId;

            // Auto-create account for new user
            const createAccountSql = "INSERT INTO accounts (user_id, balance, used_margin, leverage) VALUES (?, ?, ?, ?)";

            db.query(createAccountSql, [userId, 10000, 0, 100], (accountErr) => {
              if (accountErr) {
                console.log("Error creating account:", accountErr);
                // Still resolve since user was created
              }

              resolve({
                message: "Register success",
                userId: userId
              });
            });
          });
        } catch (error) {
          reject(error);
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
      // Get user's account
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

        // Get product info & current price
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
          const currentPrice = formatDecimal(product.current_price || 0);

          // Validate price logic
          const errors = {};
          const openPrice = parseFloat(currentPrice);
          const sl = parseFloat(stopLoss);
          const tp = parseFloat(takeProfit);
          const vol = parseFloat(volume);

          if (side === 'BUY') {
            if (sl >= openPrice) {
              errors.stop_loss = 'For BUY: stop_loss must be < open_price';
            }
            if (tp <= openPrice) {
              errors.take_profit = 'For BUY: take_profit must be > open_price';
            }
          } else {
            if (sl <= openPrice) {
              errors.stop_loss = 'For SELL: stop_loss must be > open_price';
            }
            if (tp >= openPrice) {
              errors.take_profit = 'For SELL: take_profit must be < open_price';
            }
          }

          if (Object.keys(errors).length > 0) {
            return reject(new ValidationError('Price validation failed', errors));
          }

          // Calculate required margin
          const requiredMargin = calculateRequiredMargin(currentPrice, vol, account.leverage);
          const totalUsedMargin = parseFloat(account.used_margin) + requiredMargin;
          const availableBalance = parseFloat(account.balance);

          // Check balance
          if (availableBalance < totalUsedMargin) {
            return reject(
              new InsufficientBalanceError(
                formatDecimal(totalUsedMargin),
                formatDecimal(availableBalance)
              )
            );
          }

          // Create order - START TRANSACTION
          db.query('START TRANSACTION', (err) => {
            if (err) {
              return reject(new Error('Transaction error: ' + err.message));
            }

            // Update account - add used_margin
            const updateAccountQuery = `
              UPDATE accounts
              SET used_margin = used_margin + ?
              WHERE account_id = ?
            `;

            db.query(updateAccountQuery, [requiredMargin, account.account_id], (err) => {
              if (err) {
                db.query('ROLLBACK');
                return reject(new Error('Update account error: ' + err.message));
              }

              // Insert order
              const insertOrderQuery = `
                INSERT INTO orders (
                  account_id, product_id, side, volume,
                  open_price, stop_loss, take_profit, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
              `;

              db.query(
                insertOrderQuery,
                [account.account_id, productId, side, vol, currentPrice, sl, tp],
                (err, result) => {
                  if (err) {
                    db.query('ROLLBACK');
                    return reject(new Error('Insert order error: ' + err.message));
                  }

                  // Commit transaction
                  db.query('COMMIT', (err) => {
                    if (err) {
                      db.query('ROLLBACK');
                      return reject(new Error('Commit error: ' + err.message));
                    }

                    resolve({
                      message: 'Order created successfully',
                      order_id: result.insertId,
                      open_price: currentPrice,
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
      // Get order with account check
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

        // Verify user ownership
        if (order.user_id !== userId) {
          return reject(new UnauthorizedError('You do not own this order'));
        }

        // Check if order is open
        if (order.status !== 'OPEN') {
          return reject(new ConflictError('Order is not open'));
        }

        // Calculate profit/loss
        const closePriceNum = parseFloat(closePrice);
        const openPrice = parseFloat(order.open_price);
        const volume = parseFloat(order.volume);

        const pnl = calculatePnL(openPrice, closePriceNum, volume, order.side);

        // START TRANSACTION
        db.query('START TRANSACTION', (err) => {
          if (err) {
            return reject(new Error('Transaction error: ' + err.message));
          }

          // Get original required margin to deduct
          const requiredMargin = calculateRequiredMargin(openPrice, volume, order.leverage);

          // Update order
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

            // Update account - add balance, deduct used_margin
            const updateAccountQuery = `
              UPDATE accounts
              SET balance = balance + ?, used_margin = used_margin - ?
              WHERE account_id = ?
            `;

            db.query(
              updateAccountQuery,
              [pnl, requiredMargin, order.account_id],
              (err) => {
                if (err) {
                  db.query('ROLLBACK');
                  return reject(new Error('Update account error: ' + err.message));
                }

                // Commit transaction
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
              }
            );
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
