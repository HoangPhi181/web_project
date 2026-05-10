// backend/mediators/CentralMediator.js
// Toàn bộ logic nghiệp vụ nằm ở đây.
// Route chỉ làm 1 việc: nhận request → gọi Mediator → trả response.

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const db     = require("../db");
const { sendOTP } = require("../utils/mailer");

// ── Helper dùng chung ─────────────────────────────────────────────────────────
const q = (sql, params = []) => db.queryAsync(sql, params);

async function transaction(logicFn) {
  const conn = await new Promise((res, rej) => db.getConnection((e, c) => e ? rej(e) : res(c)));
  const run  = (sql, p = []) => new Promise((res, rej) => conn.query(sql, p, (e, r) => e ? rej(e) : res(r)));
  try {
    await run("START TRANSACTION");
    const result = await logicFn(run);
    await run("COMMIT");
    return result;
  } catch (err) {
    await run("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
const Auth = {
  async register(username, email, password) {
    const hash = await bcrypt.hash(password, 10);
    return transaction(async (run) => {
      try {
        const { insertId: userId } = await run(
          "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
          [username, email, hash]
        );
        await run("INSERT INTO accounts (user_id, balance, leverage) VALUES (?, 10000, 100)", [userId]);
        return { message: "Đăng ký thành công", userId };
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") throw new Error("Username hoặc email đã tồn tại");
        throw err;
      }
    });
  },

  async login(email, password) {
    const [user] = await q("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw new Error("Sai email hoặc mật khẩu");
    if (user.status_account === "blocked") throw new Error("Tài khoản đã bị khóa");
    await q("UPDATE users SET is_online = TRUE WHERE user_id = ?", [user.user_id]);
    const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
    return { message: "Đăng nhập thành công", token };
  },

  async logout(userId) {
    await q("UPDATE users SET is_online = FALSE WHERE user_id = ?", [userId]);
    return { message: "Đăng xuất thành công" };
  },

  async getProfile(userId) {
    const [user] = await q(
      "SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?", [userId]
    );
    if (!user) throw new Error("Không tìm thấy user");
    return user;
  },

  async updateProfile(userId, { username, email }) {
    if (!username?.trim()) throw new Error("Username không được trống");
    if (!email?.trim())    throw new Error("Email không được trống");
    const result = await q(
      "UPDATE users SET username = ?, email = ? WHERE user_id = ?",
      [username.trim(), email.trim(), userId]
    );
    if (result.affectedRows === 0) throw new Error("Không tìm thấy user");
    return { message: "Cập nhật thành công" };
  },

  // ── QUÊN MẬT KHẨU — Bước 1 ───────────────────────────────────────────────
  //
  // Luồng:
  //   BƯỚC 1: User nhập email → backend gửi OTP về email
  //           POST /api/auth/forgot-password
  //
  //   BƯỚC 2: User nhập OTP + mật khẩu mới → backend xác nhận → đổi mật khẩu
  //           POST /api/auth/reset-password
  //
  // Dùng chung 2 cột đã có sẵn trong bảng users:
  //   verify_code         VARCHAR(6)  — lưu OTP 6 số
  //   verify_code_expires TIMESTAMP   — thời điểm hết hạn (5 phút)
  // ─────────────────────────────────────────────────────────────────────────

  // POST /api/auth/forgot-password
  // Nhận: { email }
  // Xử lý:
  //   1. Kiểm tra email có tồn tại trong DB không
  //   2. Sinh OTP 6 số ngẫu nhiên
  //   3. Lưu OTP + thời gian hết hạn vào DB
  //   4. Gửi email chứa OTP tới user
  // Trả về: thông báo đã gửi (không tiết lộ email có tồn tại hay không — bảo mật)
  async forgotPassword(email) {
    // Tìm user theo email
    const [user] = await q("SELECT user_id, email FROM users WHERE email = ?", [email]);

    // Không tiết lộ email có tồn tại hay không
    // → Luôn trả về cùng 1 thông báo dù email đúng hay sai (tránh dò email)
    if (!user) return { message: "Nếu email tồn tại, mã OTP đã được gửi." };

    // Sinh OTP 6 số ngẫu nhiên: 100000 → 999999
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();

    // Hết hạn sau 5 phút kể từ thời điểm gửi
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu OTP vào DB — dùng chung cột verify_code với chức năng rút tiền
    await q(
      "UPDATE users SET verify_code = ?, verify_code_expires = ? WHERE user_id = ?",
      [otp, expires, user.user_id]
    );

    // Gửi email OTP đặt lại mật khẩu
    await sendOTP(user.email, otp, "reset");

    return { message: "Nếu email tồn tại, mã OTP đã được gửi." };
  },

  // POST /api/auth/reset-password
  // Nhận: { email, otp, new_password }
  // Xử lý:
  //   1. Tìm user theo email
  //   2. Kiểm tra OTP đúng không
  //   3. Kiểm tra OTP còn hạn không (< 5 phút)
  //   4. Hash mật khẩu mới
  //   5. Cập nhật password_hash vào DB
  //   6. Xóa OTP đã dùng (tránh dùng lại)
  async resetPassword(email, otp, newPassword) {
    // Validate mật khẩu mới tối thiểu 8 ký tự
    if (!newPassword || newPassword.length < 8)
      throw new Error("Mật khẩu mới phải từ 8 ký tự trở lên");

    // Tìm user kèm thông tin OTP
    const [user] = await q(
      "SELECT user_id, verify_code, verify_code_expires FROM users WHERE email = ?",
      [email]
    );
    if (!user)              throw new Error("Email không tồn tại");
    if (!user.verify_code)  throw new Error("Chưa yêu cầu đặt lại mật khẩu");

    // Kiểm tra OTP có đúng không
    if (user.verify_code !== otp.toString().trim())
      throw new Error("Mã OTP không đúng");

    // Kiểm tra OTP còn hạn không
    if (new Date() > new Date(user.verify_code_expires))
      throw new Error("Mã OTP đã hết hạn. Vui lòng yêu cầu lại.");

    // Hash mật khẩu mới trước khi lưu
    const hash = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới + xóa OTP đã dùng (1 lần dùng duy nhất)
    await q(
      "UPDATE users SET password_hash = ?, verify_code = NULL, verify_code_expires = NULL WHERE user_id = ?",
      [hash, user.user_id]
    );

    return { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TRADE
// ─────────────────────────────────────────────────────────────────────────────
const Trade = {
  // Kiểm tra user có bị khóa không — gọi trước khi tạo lệnh
  async checkNotBlocked(userId) {
    const [user] = await q("SELECT status_account FROM users WHERE user_id = ?", [userId]);
    if (!user)                            throw new Error("Không tìm thấy user");
    if (user.status_account === "blocked") throw new Error("Tài khoản bị khóa, không thể giao dịch");
  },

  async createOrder(userId, productId, side, volume, stopLoss = null, takeProfit = null) {
    return transaction(async (run) => {
      const [account] = await run("SELECT * FROM accounts WHERE user_id = ? FOR UPDATE", [userId]);
      if (!account) throw new Error("Không tìm thấy tài khoản");

      const [product] = await run(
        "SELECT * FROM products WHERE product_id = ? AND is_active = TRUE", [productId]
      );
      if (!product) throw new Error("Sản phẩm không tồn tại");

      const margin = (parseFloat(product.current_price) * parseFloat(volume)) / (account.leverage || 100);
      if (parseFloat(account.balance) < margin)
        throw new Error(`Không đủ số dư. Cần: ${margin.toFixed(2)}, Có: ${account.balance}`);

      await run(
        "UPDATE accounts SET balance = balance - ?, used_margin = used_margin + ? WHERE account_id = ?",
        [margin, margin, account.account_id]
      );
      const { insertId: orderId } = await run(
        "INSERT INTO orders (account_id, product_id, side, volume, open_price, stop_loss, take_profit, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')",
        [account.account_id, productId, side, volume, product.current_price, stopLoss, takeProfit]
      );
      return { message: "Đặt lệnh thành công", orderId, open_price: product.current_price, margin: margin.toFixed(2) };
    });
  },

  async getOpenOrders(userId) {
    return q(
      `SELECT o.order_id, o.side, o.volume, o.open_price, o.stop_loss, o.take_profit, o.opened_at,
              p.symbol, p.name, p.current_price,
              CASE WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
                   WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume END AS floating_pnl
       FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id = ? AND o.status = 'OPEN'
       ORDER BY o.opened_at DESC`,
      [userId]
    );
  },

  // Balance + floating P&L tổng hợp
  async getBalance(userId) {
    return q(
      `SELECT a.account_id, a.balance, a.leverage,
              COALESCE(SUM(
                CASE WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
                     WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume ELSE 0 END
              ), 0) AS floating_pnl,
              a.balance + COALESCE(SUM(
                CASE WHEN o.side='BUY'  THEN (p.current_price - o.open_price) * o.volume
                     WHEN o.side='SELL' THEN (o.open_price - p.current_price) * o.volume ELSE 0 END
              ), 0) AS equity
       FROM accounts a
       LEFT JOIN orders   o ON a.account_id = o.account_id AND o.status = 'OPEN'
       LEFT JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id = ?
       GROUP BY a.account_id`,
      [userId]
    );
  },

  async closeOrder(userId, orderId, closePrice) {
    return transaction(async (run) => {
      const [order] = await run(
        `SELECT o.*, a.leverage FROM orders o
         JOIN accounts a ON o.account_id = a.account_id
         WHERE o.order_id = ? AND a.user_id = ? AND o.status = 'OPEN' FOR UPDATE`,
        [orderId, userId]
      );
      if (!order) throw new Error("Không tìm thấy lệnh hoặc lệnh đã đóng");

      const pnl    = order.side === "BUY"
        ? (parseFloat(closePrice) - parseFloat(order.open_price)) * parseFloat(order.volume)
        : (parseFloat(order.open_price) - parseFloat(closePrice)) * parseFloat(order.volume);
      const margin = (parseFloat(order.open_price) * parseFloat(order.volume)) / (order.leverage || 100);

      await run(
        "UPDATE accounts SET balance = balance + ?, used_margin = GREATEST(used_margin - ?, 0) WHERE account_id = ?",
        [margin + pnl, margin, order.account_id]
      );
      await run(
        "UPDATE orders SET status='CLOSED', close_price=?, profit_loss=?, closed_at=NOW() WHERE order_id=?",
        [closePrice, pnl, orderId]
      );
      return { message: "Đóng lệnh thành công", orderId, pnl: pnl.toFixed(2), close_price: closePrice };
    });
  },

  async getOrderHistory(userId, limit = 20, offset = 0) {
    const orders = await q(
      `SELECT o.order_id, o.side, o.volume, o.open_price, o.close_price, o.profit_loss,
              o.stop_loss, o.take_profit, o.opened_at, o.closed_at, p.symbol, p.name
       FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id = ? AND o.status = 'CLOSED'
       ORDER BY o.closed_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [{ total }] = await q(
      "SELECT COUNT(*) AS total FROM orders o JOIN accounts a ON o.account_id=a.account_id WHERE a.user_id=? AND o.status='CLOSED'",
      [userId]
    );
    return { data: orders, total, limit, offset };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WALLET — Nạp tiền (QR VietQR) / Rút tiền / Lịch sử
//
// Luồng nạp tiền:
//   1. User: POST /api/transactions/deposit        → nhận QR + mã tham chiếu
//   2. User: POST /api/transactions/deposit/:id/paid → báo đã chuyển khoản
//   3. Admin: GET  /api/admin/deposits              → xem danh sách chờ
//   4. Admin: PUT  /api/admin/deposits/:id/confirm  → xác nhận → tiền vào ngay
//             PUT  /api/admin/deposits/:id/reject   → từ chối
// ─────────────────────────────────────────────────────────────────────────────
const Wallet = {
  async deposit(userId, amount) {
    const [account] = await q("SELECT account_id FROM accounts WHERE user_id = ?", [userId]);
    if (!account) throw new Error("Không tìm thấy tài khoản");

    const refCode = "DEP" + Date.now(); // Mã duy nhất — user ghi vào nội dung CK
    const { insertId: transactionId } = await q(
      "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'DEPOSIT', 'PENDING', ?)",
      [account.account_id, amount, refCode]
    );

    // Link QR VietQR — miễn phí, không cần API key
    // Cấu hình trong .env: BANK_ID, BANK_ACCOUNT, BANK_NAME
    const qrUrl =
      `https://img.vietqr.io/image/${process.env.BANK_ID || "MB"}-${process.env.BANK_ACCOUNT || "0123456789"}-compact2.png` +
      `?amount=${amount}&addInfo=${refCode}&accountName=${encodeURIComponent(process.env.BANK_NAME || "TRADING PLATFORM")}`;

    return { message: "Tạo QR thành công", transaction_id: transactionId, reference_code: refCode, amount, qr_url: qrUrl };
  },

  async markAsPaid(userId, transactionId) {
    const [tx] = await q(
      "SELECT t.status FROM transactions t JOIN accounts a ON t.account_id=a.account_id WHERE t.transaction_id=? AND a.user_id=? AND t.type='DEPOSIT'",
      [transactionId, userId]
    );
    if (!tx)                       throw new Error("Không tìm thấy giao dịch");
    if (tx.status === "COMPLETED") throw new Error("Giao dịch đã được xác nhận");
    if (tx.status === "FAILED")    throw new Error("Giao dịch đã bị từ chối");
    return { message: "Đã ghi nhận. Vui lòng chờ admin xác nhận." };
  },

  async confirmDeposit(transactionId) {
    return transaction(async (run) => {
      const [tx] = await run(
        "SELECT * FROM transactions WHERE transaction_id=? AND type='DEPOSIT' FOR UPDATE",
        [transactionId]
      );
      if (!tx)                       throw new Error("Không tìm thấy giao dịch");
      if (tx.status === "COMPLETED") throw new Error("Đã xác nhận trước đó");
      if (tx.status === "FAILED")    throw new Error("Giao dịch đã bị từ chối");

      await run("UPDATE accounts SET balance = balance + ? WHERE account_id = ?", [tx.amount, tx.account_id]);
      await run("UPDATE transactions SET status='COMPLETED' WHERE transaction_id=?", [transactionId]);
      return { message: "Xác nhận nạp tiền thành công", transaction_id: transactionId, amount: tx.amount };
    });
  },

  async rejectDeposit(transactionId) {
    const [tx] = await q("SELECT status FROM transactions WHERE transaction_id=? AND type='DEPOSIT'", [transactionId]);
    if (!tx)                       throw new Error("Không tìm thấy giao dịch");
    if (tx.status === "COMPLETED") throw new Error("Đã xác nhận, không thể từ chối");
    if (tx.status === "FAILED")    throw new Error("Đã từ chối trước đó");
    await q("UPDATE transactions SET status='FAILED' WHERE transaction_id=?", [transactionId]);
    return { message: "Đã từ chối giao dịch" };
  },

  // BƯỚC 1 — User yêu cầu rút tiền → gửi OTP về email
  async requestWithdraw(userId, amount) {
    // Lấy email + kiểm tra số dư
    const [user] = await q("SELECT email FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");

    const [account] = await q("SELECT balance FROM accounts WHERE user_id=?", [userId]);
    if (!account) throw new Error("Không tìm thấy tài khoản");
    if (parseFloat(account.balance) < parseFloat(amount))
      throw new Error(`Số dư không đủ. Có: ${account.balance}, Cần rút: ${amount}`);

    // Sinh mã OTP 6 số ngẫu nhiên
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // hết hạn sau 5 phút

    // Lưu OTP vào DB
    await q(
      "UPDATE users SET verify_code=?, verify_code_expires=? WHERE user_id=?",
      [otp, expires, userId]
    );

    // Gửi email
    await sendOTP(user.email, otp);

    return { message: `Mã OTP đã gửi tới ${user.email}. Có hiệu lực trong 5 phút.` };
  },

  // BƯỚC 2 — User nhập OTP → xác nhận rút tiền
  async verifyWithdraw(userId, amount, otp) {
    // Kiểm tra OTP
    const [user] = await q(
      "SELECT verify_code, verify_code_expires FROM users WHERE user_id=?",
      [userId]
    );
    if (!user)                          throw new Error("Không tìm thấy user");
    if (!user.verify_code)              throw new Error("Chưa yêu cầu mã OTP");
    if (user.verify_code !== otp)       throw new Error("Mã OTP không đúng");
    if (new Date() > new Date(user.verify_code_expires))
                                        throw new Error("Mã OTP đã hết hạn");

    // OTP hợp lệ → xóa mã + thực hiện rút tiền trong transaction
    return transaction(async (run) => {
      const [account] = await run("SELECT * FROM accounts WHERE user_id=? FOR UPDATE", [userId]);
      if (!account) throw new Error("Không tìm thấy tài khoản");
      if (parseFloat(account.balance) < parseFloat(amount))
        throw new Error(`Số dư không đủ. Có: ${account.balance}, Cần rút: ${amount}`);

      // Trừ tiền
      await run("UPDATE accounts SET balance = balance - ? WHERE account_id=?", [amount, account.account_id]);

      // Lưu giao dịch
      const refCode = "WD" + Date.now();
      await run(
        "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'WITHDRAW', 'COMPLETED', ?)",
        [account.account_id, amount, refCode]
      );

      // Xóa OTP đã dùng
      await run("UPDATE users SET verify_code=NULL, verify_code_expires=NULL WHERE user_id=?", [userId]);

      return { message: "Rút tiền thành công", amount, reference_code: refCode };
    });
  },

  async withdraw(userId, amount) {
    return transaction(async (run) => {
      const [account] = await run("SELECT * FROM accounts WHERE user_id=? FOR UPDATE", [userId]);
      if (!account) throw new Error("Không tìm thấy tài khoản");
      if (parseFloat(account.balance) < parseFloat(amount))
        throw new Error(`Số dư không đủ. Có: ${account.balance}, Cần rút: ${amount}`);
      await run("UPDATE accounts SET balance = balance - ? WHERE account_id=?", [amount, account.account_id]);
      const refCode = "WD" + Date.now();
      await run(
        "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'WITHDRAW', 'COMPLETED', ?)",
        [account.account_id, amount, refCode]
      );
      return { message: "Rút tiền thành công", amount, reference_code: refCode };
    });
  },

  async getHistory(userId) {
    return q(
      `SELECT t.transaction_id, t.amount, t.type, t.status, t.reference_code, t.created_at
       FROM transactions t JOIN accounts a ON t.account_id=a.account_id
       WHERE a.user_id=? ORDER BY t.created_at DESC LIMIT 50`,
      [userId]
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const Admin = {
  async getAllUsers() {
    return q("SELECT user_id, username, email, phone, role, status_account, is_online, created_at FROM users ORDER BY user_id DESC");
  },

  async searchByPhone(phone) {
    return q(
      "SELECT user_id, username, email, phone, role, status_account, is_online FROM users WHERE phone LIKE ?",
      [`%${phone}%`]
    );
  },

  async blockUser(adminId, userId) {
    if (adminId === userId) throw new Error("Không thể tự khóa tài khoản của mình");
    const [user] = await q("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");
    await q("UPDATE users SET status_account='blocked' WHERE user_id=?", [userId]);
    return { message: "Đã khóa user thành công" };
  },

  async unblockUser(adminId, userId) {
    const [user] = await q("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");
    await q("UPDATE users SET status_account='active' WHERE user_id=?", [userId]);
    return { message: "Đã mở khóa user thành công" };
  },

  async updateRole(adminId, userId, newRole) {
    if (!["user", "admin"].includes(newRole)) throw new Error("Role chỉ được là 'user' hoặc 'admin'");
    const [user] = await q("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");
    await q("UPDATE users SET role=? WHERE user_id=?", [newRole, userId]);
    return { message: "Cập nhật role thành công" };
  },

  async getPendingDeposits() {
    return q(
      `SELECT t.transaction_id, t.amount, t.reference_code, t.created_at,
              u.user_id, u.username, u.email, a.account_id
       FROM transactions t
       JOIN accounts a ON t.account_id=a.account_id
       JOIN users    u ON a.user_id=u.user_id
       WHERE t.type='DEPOSIT' AND t.status='PENDING'
       ORDER BY t.created_at ASC`
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
module.exports = { Auth, Trade, Wallet, Admin };