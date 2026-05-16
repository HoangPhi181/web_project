// backend/mediators/tradeMediator.js (v2)
// Thay đổi:
//   - Tất cả query dùng account_type để lấy đúng tài khoản REAL/DEMO
//   - Tài khoản DEMO: không được nạp/rút tiền thật, chỉ trade bằng tiền ảo
//   - Tài khoản DEMO: có thể reset về 10000 bất cứ lúc nào

const { q, transaction } = require("./helpers");

const Trade = {

  // Kiểm tra tài khoản bị khóa
  async checkNotBlocked(userId) {
    const [user] = await q("SELECT status_account FROM users WHERE user_id=?", [userId]);
    if (!user)                             throw new Error("Không tìm thấy user");
    if (user.status_account === "blocked") throw new Error("Tài khoản bị khóa, không thể giao dịch");
  },

  // Lấy account theo loại (REAL hoặc DEMO)
  // Helper dùng nội bộ trong tradeMediator
  async _getAccount(userId, accountType) {
    const [account] = await q(
      "SELECT * FROM accounts WHERE user_id=? AND account_type=?",
      [userId, accountType]
    );
    if (!account) throw new Error(`Không tìm thấy tài khoản ${accountType}`);
    return account;
  },

  // POST /api/orders/create?type=REAL|DEMO
  // accountType từ query string — frontend gửi lên để biết trade ví nào
  async createOrder(userId, productId, side, volume, stopLoss = null, takeProfit = null, accountType = "DEMO") {
    if (!["REAL", "DEMO"].includes(accountType))
      throw new Error("accountType phải là REAL hoặc DEMO");

    return transaction(async (run) => {
      // Khóa đúng tài khoản theo loại
      const [account] = await run(
        "SELECT * FROM accounts WHERE user_id=? AND account_type=? FOR UPDATE",
        [userId, accountType]
      );
      if (!account) throw new Error(`Không tìm thấy tài khoản ${accountType}`);

      const [product] = await run(
        "SELECT * FROM products WHERE product_id=? AND is_active=TRUE",
        [productId]
      );
      if (!product) throw new Error("Sản phẩm không tồn tại hoặc ngừng giao dịch");

      // Tính margin
      const margin = (parseFloat(product.current_price) * parseFloat(volume)) / (account.leverage || 100);

      if (parseFloat(account.balance) < margin)
        throw new Error(`Không đủ số dư ${accountType}. Cần: ${margin.toFixed(2)}, Có: ${account.balance}`);

      await run(
        "UPDATE accounts SET balance=balance-?, used_margin=used_margin+? WHERE account_id=?",
        [margin, margin, account.account_id]
      );

      const { insertId: orderId } = await run(
        `INSERT INTO orders (account_id, product_id, side, volume, open_price, stop_loss, take_profit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
        [account.account_id, productId, side, volume, product.current_price, stopLoss, takeProfit]
      );

      return {
        message:         `Đặt lệnh ${accountType} thành công`,
        orderId,
        account_type:    accountType,
        open_price:      product.current_price,
        required_margin: margin.toFixed(2),
      };
    });
  },

  // GET /api/orders/opening?type=REAL|DEMO
  async getOpenOrders(userId, accountType = "DEMO") {
    return q(
      `SELECT o.order_id, o.side, o.volume, o.open_price, o.stop_loss, o.take_profit, o.opened_at,
              p.symbol, p.name, p.current_price,
              a.account_type,
              CASE
                WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
                WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume
              END AS floating_pnl
       FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id=? AND a.account_type=? AND o.status='OPEN'
       ORDER BY o.opened_at DESC`,
      [userId, accountType]
    );
  },

  // POST /api/orders/:id/close
  async closeOrder(userId, orderId, closePrice) {
    return transaction(async (run) => {
      const [order] = await run(
        `SELECT o.*, a.leverage, a.account_type FROM orders o
         JOIN accounts a ON o.account_id = a.account_id
         WHERE o.order_id=? AND a.user_id=? AND o.status='OPEN' FOR UPDATE`,
        [orderId, userId]
      );
      if (!order) throw new Error("Không tìm thấy lệnh hoặc lệnh đã đóng");

      const pnl = order.side === "BUY"
        ? (parseFloat(closePrice) - parseFloat(order.open_price)) * parseFloat(order.volume)
        : (parseFloat(order.open_price) - parseFloat(closePrice)) * parseFloat(order.volume);

      const margin = (parseFloat(order.open_price) * parseFloat(order.volume)) / (order.leverage || 100);

      await run(
        `UPDATE accounts SET balance=balance+?+?, used_margin=GREATEST(used_margin-?,0)
         WHERE account_id=?`,
        [margin, pnl, margin, order.account_id]
      );
      await run(
        "UPDATE orders SET status='CLOSED', close_price=?, profit_loss=?, closed_at=NOW() WHERE order_id=?",
        [closePrice, pnl, orderId]
      );

      return {
        message:      "Đóng lệnh thành công",
        orderId,
        account_type: order.account_type,
        pnl:          pnl.toFixed(2),
        close_price:  closePrice,
      };
    });
  },

  // GET /api/orders/history/list?type=REAL|DEMO
  async getOrderHistory(userId, limit = 20, offset = 0, accountType = "DEMO") {
    const orders = await q(
      `SELECT o.order_id, o.side, o.volume, o.open_price, o.close_price,
              o.profit_loss, o.opened_at, o.closed_at, p.symbol, p.name, a.account_type
       FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id=? AND a.account_type=? AND o.status='CLOSED'
       ORDER BY o.closed_at DESC LIMIT ? OFFSET ?`,
      [userId, accountType, limit, offset]
    );
    const [{ total }] = await q(
      `SELECT COUNT(*) AS total FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       WHERE a.user_id=? AND a.account_type=? AND o.status='CLOSED'`,
      [userId, accountType]
    );
    return { data: orders, total, limit, offset, account_type: accountType };
  },

  // GET /api/orders/balance?type=REAL|DEMO
  async getBalance(userId, accountType = "DEMO") {
    return q(
      `SELECT
         a.account_id, a.account_type, a.balance, a.leverage,
         COALESCE(SUM(
           CASE
             WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
             WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume
             ELSE 0
           END
         ), 0) AS floating_pnl,
         a.balance + COALESCE(SUM(
           CASE
             WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
             WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume
             ELSE 0
           END
         ), 0) AS equity
       FROM accounts a
       LEFT JOIN orders   o ON a.account_id=o.account_id AND o.status='OPEN'
       LEFT JOIN products p ON o.product_id=p.product_id
       WHERE a.user_id=? AND a.account_type=?
       GROUP BY a.account_id`,
      [userId, accountType]
    );
  },

  // Lấy cả 2 tài khoản REAL + DEMO cùng lúc (dùng cho dashboard tổng quan)
  async getBothBalances(userId) {
    return q(
      `SELECT
         a.account_id, a.account_type, a.balance, a.leverage,
         COALESCE(SUM(
           CASE
             WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
             WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume
             ELSE 0
           END
         ), 0) AS floating_pnl,
         a.balance + COALESCE(SUM(
           CASE
             WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
             WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume
             ELSE 0
           END
         ), 0) AS equity
       FROM accounts a
       LEFT JOIN orders   o ON a.account_id=o.account_id AND o.status='OPEN'
       LEFT JOIN products p ON o.product_id=p.product_id
       WHERE a.user_id=?
       GROUP BY a.account_id
       ORDER BY a.account_type ASC`,   /* DEMO trước, REAL sau */
      [userId]
    );
  },

  // POST /api/orders/demo/reset
  // Reset tài khoản DEMO về 10000, xóa hết lệnh đang mở
  // Tài khoản REAL không có chức năng này
  async resetDemo(userId) {
    return transaction(async (run) => {
      // Lấy tài khoản DEMO
      const [account] = await run(
        "SELECT * FROM accounts WHERE user_id=? AND account_type='DEMO' FOR UPDATE",
        [userId]
      );
      if (!account) throw new Error("Không tìm thấy tài khoản DEMO");

      // Đóng tất cả lệnh DEMO đang mở (không tính P&L, chỉ reset)
      await run(
        `UPDATE orders SET status='CLOSED', close_price=open_price, profit_loss=0, closed_at=NOW()
         WHERE account_id=? AND status='OPEN'`,
        [account.account_id]
      );

      // Reset balance về 10000, used_margin về 0
      await run(
        "UPDATE accounts SET balance=10000, used_margin=0 WHERE account_id=?",
        [account.account_id]
      );

      return { message: "Đã reset tài khoản DEMO về 10.000. Sẵn sàng luyện tập lại!" };
    });
  },
};

module.exports = { Trade };