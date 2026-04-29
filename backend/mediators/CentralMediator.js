// backend/mediators/CentralMediator.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const { calculateRequiredMargin, calculatePnL, calculatePnLPercent, formatDecimal } = require("../utils/calculations");
const { ValidationError, InsufficientBalanceError, NotFoundError, UnauthorizedError, ConflictError } = require("../utils/errors");

// ─── Helpers ────────────────────────────────────────────────────────────────

// Lấy một connection cố định từ Pool — bắt buộc để Transaction hoạt động đúng
const getConnection = () =>
  new Promise((resolve, reject) =>
    db.getConnection((err, conn) => (err ? reject(err) : resolve(conn)))
  );

// Dùng ngoài Transaction (Pool tự quản lý connection)
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// Dùng bên trong Transaction (gắn với connection cụ thể)
const connQuery = (conn, sql, params = []) =>
  new Promise((resolve, reject) =>
    conn.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

const refCode = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;

class CentralMediator {
  // Giữ nguyên 1 connection từ đầu đến cuối Transaction
  static async withTransaction(fn) {
    const conn = await getConnection();
    await connQuery(conn, "START TRANSACTION");
    try {
      const result = await fn(conn);
      await connQuery(conn, "COMMIT");
      return result;
    } catch (err) {
      await connQuery(conn, "ROLLBACK").catch((e) => console.error("Rollback failed:", e));
      throw err;
    } finally {
      conn.release(); // Trả về Pool dù thành công hay thất bại
    }
  }

  static async verifyAdmin(adminId) {
    const [admin] = await query("SELECT role FROM users WHERE user_id = ?", [adminId]);
    if (!admin || admin.role !== "admin") throw new UnauthorizedError("Admin access required");
  }

  // ============================================================
  // AUTH
  // ============================================================

  static async registerUser(username, email, password, country = null) {
    if (!password || password.length < 8) throw new ValidationError("Password must be at least 8 characters");

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.withTransaction(async (conn) => {
      try {
        const { insertId: userId } = await connQuery(conn,
          "INSERT INTO users (username, email, country, password_hash, role) VALUES (?, ?, ?, ?, 'user')",
          [username, email, country, hashedPassword]
        );
        await connQuery(conn,
          "INSERT INTO accounts (user_id, balance, used_margin, leverage) VALUES (?, 10000, 0, 100)",
          [userId]
        );
        return { message: "Register success", userId };
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new ConflictError("Username or email already exists");
        throw err;
      }
    });
  }

  static async loginUser(email, password) {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");

    const [user] = await query(
      "SELECT user_id, username, email, role, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!user) throw new UnauthorizedError("User not found");
    if (!(await bcrypt.compare(password, user.password_hash))) throw new UnauthorizedError("Wrong password");

    const token = jwt.sign(
      { id: user.user_id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      message: "Login success",
      token,
      user: { id: user.user_id, username: user.username, email: user.email, role: user.role }
    };
  }

  // ============================================================
  // TRADING
  // ============================================================

  static async createOrder(userId, productId, side, volume, stopLoss, takeProfit) {
    return this.withTransaction(async (conn) => {
      // FOR UPDATE lock account trên connection này — tránh race condition
      const [account] = await connQuery(conn,
        "SELECT account_id, balance, used_margin, leverage FROM accounts WHERE user_id = ? FOR UPDATE",
        [userId]
      );
      if (!account) throw new NotFoundError("Account");

      const [product] = await connQuery(conn,
        "SELECT product_id, symbol, current_price, is_active FROM products WHERE product_id = ?",
        [productId]
      );
      if (!product || !product.is_active) throw new NotFoundError("Product");

      const openPrice = parseFloat(product.current_price);
      const vol = parseFloat(volume);
      const sl = stopLoss != null ? parseFloat(stopLoss) : null;
      const tp = takeProfit != null ? parseFloat(takeProfit) : null;

      if (isNaN(openPrice) || openPrice <= 0) throw new ValidationError("Validation failed", { product_id: "Invalid product price" });
      if (isNaN(vol) || vol <= 0) throw new ValidationError("Validation failed", { volume: "Volume must be greater than 0" });

      const errors = {};
      if (sl != null) {
        if (isNaN(sl) || sl <= 0) errors.stop_loss = "Stop loss must be greater than 0";
        else if (side === "BUY" && sl >= openPrice) errors.stop_loss = "For BUY: stop_loss must be < open_price";
        else if (side === "SELL" && sl <= openPrice) errors.stop_loss = "For SELL: stop_loss must be > open_price";
      }
      if (tp != null) {
        if (isNaN(tp) || tp <= 0) errors.take_profit = "Take profit must be greater than 0";
        else if (side === "BUY" && tp <= openPrice) errors.take_profit = "For BUY: take_profit must be > open_price";
        else if (side === "SELL" && tp >= openPrice) errors.take_profit = "For SELL: take_profit must be < open_price";
      }
      if (Object.keys(errors).length > 0) throw new ValidationError("Price validation failed", errors);

      const requiredMargin = calculateRequiredMargin(openPrice, vol, account.leverage);
      const balance = parseFloat(account.balance);

      if (balance < requiredMargin) {
        throw new InsufficientBalanceError(formatDecimal(requiredMargin), formatDecimal(balance));
      }

      await connQuery(conn,
        "UPDATE accounts SET used_margin = used_margin + ?, balance = balance - ? WHERE account_id = ?",
        [requiredMargin, requiredMargin, account.account_id]
      );

      const { insertId: orderId } = await connQuery(conn,
        "INSERT INTO orders (account_id, product_id, side, volume, open_price, stop_loss, take_profit, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')",
        [account.account_id, productId, side, vol, openPrice, sl, tp]
      );

      return {
        message: "Order created successfully",
        order_id: orderId,
        open_price: formatDecimal(openPrice),
        symbol: product.symbol,
        status: "OPEN",
        required_margin: formatDecimal(requiredMargin)
      };
    });
  }

  static async closeOrder(userId, orderId, closePrice) {
    return this.withTransaction(async (conn) => {
      const [order] = await connQuery(conn,
        `SELECT o.order_id, o.account_id, o.side, o.volume, o.open_price, o.status,
                a.user_id, a.leverage
         FROM orders o JOIN accounts a ON o.account_id = a.account_id
         WHERE o.order_id = ? FOR UPDATE`,
        [orderId]
      );
      if (!order) throw new NotFoundError("Order");
      if (order.user_id !== userId) throw new UnauthorizedError("You do not own this order");
      if (order.status !== "OPEN") throw new ConflictError("Order is not open");

      const closePriceNum = parseFloat(closePrice);
      if (isNaN(closePriceNum) || closePriceNum <= 0) {
        throw new ValidationError("Validation failed", { close_price: "Close price must be a valid number" });
      }

      const openPrice = parseFloat(order.open_price);
      const volume = parseFloat(order.volume);
      const pnl = calculatePnL(openPrice, closePriceNum, volume, order.side);
      const requiredMargin = calculateRequiredMargin(openPrice, volume, order.leverage);

      await connQuery(conn,
        "UPDATE orders SET status = 'CLOSED', close_price = ?, profit_loss = ?, closed_at = NOW() WHERE order_id = ?",
        [closePriceNum, pnl, orderId]
      );
      await connQuery(conn,
        "UPDATE accounts SET balance = balance + ?, used_margin = GREATEST(used_margin - ?, 0) WHERE account_id = ?",
        [pnl + requiredMargin, requiredMargin, order.account_id]
      );

      return {
        message: "Order closed successfully",
        order_id: orderId,
        close_price: formatDecimal(closePriceNum),
        profit_loss: formatDecimal(pnl),
        pnl_percent: calculatePnLPercent(openPrice, closePriceNum, volume, order.side).toFixed(2),
        status: "CLOSED"
      };
    });
  }

  static async getOpenOrders(userId) {
    const orders = await query(
      `SELECT o.order_id, o.product_id, o.side, o.volume, o.open_price,
              o.stop_loss, o.take_profit, o.status, o.opened_at,
              p.symbol, p.name, p.current_price
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN accounts a ON o.account_id = a.account_id
       WHERE a.user_id = ? AND o.status = 'OPEN'
       ORDER BY o.opened_at DESC`,
      [userId]
    );

    const data = orders.map((o) => {
      const openPrice = parseFloat(o.open_price);
      const currentPrice = parseFloat(o.current_price) || 0;
      const volume = parseFloat(o.volume);
      return {
        order_id: o.order_id,
        product_id: o.product_id,
        symbol: o.symbol,
        name: o.name,
        side: o.side,
        volume: formatDecimal(volume),
        open_price: formatDecimal(openPrice),
        current_price: formatDecimal(currentPrice),
        stop_loss: o.stop_loss != null ? formatDecimal(parseFloat(o.stop_loss)) : null,
        take_profit: o.take_profit != null ? formatDecimal(parseFloat(o.take_profit)) : null,
        pnl: formatDecimal(calculatePnL(openPrice, currentPrice, volume, o.side)),
        pnl_percent: calculatePnLPercent(openPrice, currentPrice, volume, o.side).toFixed(2),
        status: o.status,
        opened_at: o.opened_at
      };
    });

    return { message: "Open orders retrieved successfully", count: data.length, data };
  }

  static async getOrderHistory(userId, limit = 20, offset = 0) {
    limit = Math.min(parseInt(limit) || 20, 100);
    offset = Math.max(parseInt(offset) || 0, 0);

    const [{ total }] = await query(
      "SELECT COUNT(*) AS total FROM orders o JOIN accounts a ON o.account_id = a.account_id WHERE a.user_id = ? AND o.status = 'CLOSED'",
      [userId]
    );

    const orders = await query(
      `SELECT o.order_id, o.product_id, o.side, o.volume, o.open_price,
              o.close_price, o.profit_loss, o.status, o.opened_at, o.closed_at,
              p.symbol, p.name
       FROM orders o
       JOIN products p ON o.product_id = p.product_id
       JOIN accounts a ON o.account_id = a.account_id
       WHERE a.user_id = ? AND o.status = 'CLOSED'
       ORDER BY o.closed_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const data = orders.map((o) => ({
      order_id: o.order_id,
      product_id: o.product_id,
      symbol: o.symbol,
      name: o.name,
      side: o.side,
      volume: formatDecimal(o.volume),
      open_price: formatDecimal(o.open_price),
      close_price: formatDecimal(o.close_price),
      pnl: formatDecimal(o.profit_loss || 0),
      pnl_percent: calculatePnLPercent(parseFloat(o.open_price), parseFloat(o.close_price), parseFloat(o.volume), o.side).toFixed(2),
      status: o.status,
      opened_at: o.opened_at,
      closed_at: o.closed_at,
      duration_minutes: o.opened_at && o.closed_at
        ? Math.round((new Date(o.closed_at) - new Date(o.opened_at)) / 60000)
        : null
    }));

    return {
      message: "Order history retrieved successfully",
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
      data
    };
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  static async sendWithdrawCode(userId) {
    const [user] = await query("SELECT user_id, email FROM users WHERE user_id = ?", [userId]);
    if (!user) throw new NotFoundError("User");

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    await query(
      "UPDATE users SET verify_code = ?, verify_code_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE user_id = ?",
      [verifyCode, userId]
    );

    // TODO: Gửi verifyCode qua email đến user.email
    console.log(`[DEV] Withdraw code for ${user.email}: ${verifyCode}`);

    return { message: "Verification code sent" };
  }

  static async processWithdraw(userId, amount, verifyCode) {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) throw new ValidationError("Invalid amount");

    return this.withTransaction(async (conn) => {
      // Lock tài khoản TRƯỚC — buộc các request song song phải xếp hàng, tránh double-spend
      const [account] = await connQuery(conn,
        "SELECT account_id, balance FROM accounts WHERE user_id = ? FOR UPDATE",
        [userId]
      );
      if (!account) throw new NotFoundError("Account");

      // Kiểm tra verify_code SAU khi đã có lock
      const [user] = await connQuery(conn,
        "SELECT verify_code, verify_code_expires FROM users WHERE user_id = ?",
        [userId]
      );
      if (!user || user.verify_code !== verifyCode) throw new ValidationError("Invalid verification code");
      if (new Date() > new Date(user.verify_code_expires)) throw new ValidationError("Verification code expired");

      // Schema dùng DECIMAL(18,8) + CHECK(balance >= 0) — DB sẽ chặn nếu balance âm
      const balance = parseFloat(account.balance);
      if (balance < withdrawAmount) {
        throw new InsufficientBalanceError(formatDecimal(withdrawAmount), formatDecimal(balance));
      }

      await connQuery(conn,
        "UPDATE accounts SET balance = balance - ? WHERE account_id = ?",
        [withdrawAmount, account.account_id]
      );

      const reference_code = refCode("WD");
      await connQuery(conn,
        "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'WITHDRAW', 'COMPLETED', ?)",
        [account.account_id, withdrawAmount, reference_code]
      );

      // Xóa code trong cùng transaction — tránh code bị dùng lại nếu có lỗi sau đó
      await connQuery(conn,
        "UPDATE users SET verify_code = NULL, verify_code_expires = NULL WHERE user_id = ?",
        [userId]
      );

      return {
        message: "Withdrawal processed successfully",
        amount: formatDecimal(withdrawAmount),
        reference_code,
        status: "COMPLETED"
      };
    });
  }

  static async processDeposit(userId, amount) {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) throw new ValidationError("Invalid amount");

    const [account] = await query("SELECT account_id FROM accounts WHERE user_id = ?", [userId]);
    if (!account) throw new NotFoundError("Account");

    const reference_code = refCode("DEP");
    await query(
      "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'DEPOSIT', 'PENDING', ?)",
      [account.account_id, depositAmount, reference_code]
    );

    // TODO: Tích hợp VietQR API để sinh QR thật
    return {
      message: "Deposit initiated - QR code generated",
      amount: formatDecimal(depositAmount),
      reference_code,
      status: "PENDING",
      instructions: "Send funds to the provided QR code. Deposit will be completed within 2-5 minutes."
    };
  }

  // ============================================================
  // ADMIN
  // ============================================================

  static async getAllUsersDetailed(adminId) {
    await this.verifyAdmin(adminId);

    const results = await query(
      `SELECT u.user_id, u.username, u.email, u.country, u.role, u.created_at,
              a.account_id, a.balance, a.used_margin, a.leverage,
              COUNT(DISTINCT o.order_id) as total_orders,
              COALESCE(SUM(o.profit_loss), 0) as total_pnl
       FROM users u
       LEFT JOIN accounts a ON u.user_id = a.user_id
       LEFT JOIN orders o ON a.account_id = o.account_id AND o.status = 'CLOSED'
       GROUP BY u.user_id, a.account_id
       ORDER BY u.created_at DESC`
    );

    const usersMap = {};
    results.forEach(({ user_id, username, email, country, role, created_at, account_id, balance, used_margin, leverage, total_orders, total_pnl }) => {
      if (!usersMap[user_id]) {
        usersMap[user_id] = { user_id, username, email, country, role, created_at, accounts: [] };
      }
      if (account_id) {
        usersMap[user_id].accounts.push({
          account_id,
          balance: formatDecimal(balance),
          used_margin: formatDecimal(used_margin),
          leverage,
          total_orders,
          total_pnl: formatDecimal(total_pnl)
        });
      }
    });

    const data = Object.values(usersMap);
    return { message: "Users retrieved successfully", count: data.length, data };
  }
}

module.exports = CentralMediator;