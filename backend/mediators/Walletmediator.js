// backend/mediators/walletMediator.js (v3)
// Thay đổi so với v2:
//   - getHistory() nhận thêm accountType để lọc REAL hoặc DEMO
//   - DEMO có lịch sử lệnh riêng (từ bảng orders)
//   - DEMO KHÔNG có transactions (nạp/rút) — chỉ REAL mới có

const { q, transaction }              = require("./Helpers");
const { saveOTP, checkOTP, clearOTP } = require("./Authmediator");
const { sendOTP }                     = require("../utils/mailer");

const Wallet = {

  // ── NẠP TIỀN — chỉ tài khoản REAL ───────────────────────────────────────
  async deposit(userId, amount) {
    const [account] = await q(
      "SELECT account_id FROM accounts WHERE user_id=? AND account_type='REAL'",
      [userId]
    );
    if (!account) throw new Error("Không tìm thấy tài khoản REAL");

    const refCode = "DEP" + Date.now();
    const { insertId: transactionId } = await q(
      "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'DEPOSIT', 'PENDING', ?)",
      [account.account_id, amount, refCode]
    );

    const bankId   = process.env.BANK_ID      || "MB";
    const bankAcc  = process.env.BANK_ACCOUNT || "0123456789";
    const bankName = process.env.BANK_NAME    || "TRADING NOVA";

    const qrUrl =
      `https://img.vietqr.io/image/${bankId}-${bankAcc}-compact2.png` +
      `?amount=${amount}&addInfo=${refCode}` +
      `&accountName=${encodeURIComponent(bankName)}`;

    return {
      message:        "Tạo QR nạp tiền REAL thành công",
      account_type:   "REAL",
      transaction_id: transactionId,
      reference_code: refCode,
      amount,
      qr_url:         qrUrl,
      note:           `Nội dung chuyển khoản bắt buộc: ${refCode}`,
    };
  },

  // User bấm "Đã thanh toán"
  async markAsPaid(userId, transactionId) {
    const [tx] = await q(
      `SELECT t.status FROM transactions t
       JOIN accounts a ON t.account_id=a.account_id
       WHERE t.transaction_id=? AND a.user_id=? AND t.type='DEPOSIT'`,
      [transactionId, userId]
    );
    if (!tx)                       throw new Error("Không tìm thấy giao dịch");
    if (tx.status === "COMPLETED") throw new Error("Giao dịch đã được xác nhận");
    if (tx.status === "FAILED")    throw new Error("Giao dịch đã bị từ chối");
    return { message: "Đã ghi nhận. Vui lòng chờ admin xác nhận." };
  },

  // Admin xác nhận → cộng tiền vào REAL
  async confirmDeposit(transactionId) {
    return transaction(async (run) => {
      const [tx] = await run(
        "SELECT * FROM transactions WHERE transaction_id=? AND type='DEPOSIT' FOR UPDATE",
        [transactionId]
      );
      if (!tx)                       throw new Error("Không tìm thấy giao dịch");
      if (tx.status === "COMPLETED") throw new Error("Đã xác nhận trước đó");
      if (tx.status === "FAILED")    throw new Error("Giao dịch đã bị từ chối");

      await run("UPDATE accounts SET balance=balance+? WHERE account_id=?", [tx.amount, tx.account_id]);
      await run("UPDATE transactions SET status='COMPLETED' WHERE transaction_id=?", [transactionId]);

      return { message: "Xác nhận nạp tiền thành công", transaction_id: transactionId, amount: tx.amount };
    });
  },

  // Admin từ chối
  async rejectDeposit(transactionId) {
    const [tx] = await q(
      "SELECT status FROM transactions WHERE transaction_id=? AND type='DEPOSIT'",
      [transactionId]
    );
    if (!tx)                       throw new Error("Không tìm thấy giao dịch");
    if (tx.status === "COMPLETED") throw new Error("Đã xác nhận, không thể từ chối");
    if (tx.status === "FAILED")    throw new Error("Đã từ chối trước đó");
    await q("UPDATE transactions SET status='FAILED' WHERE transaction_id=?", [transactionId]);
    return { message: "Đã từ chối giao dịch" };
  },

  // ── RÚT TIỀN — chỉ tài khoản REAL ───────────────────────────────────────
  async requestWithdraw(userId, amount) {
    const [user] = await q("SELECT email FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");

    const [account] = await q(
      "SELECT balance FROM accounts WHERE user_id=? AND account_type='REAL'",
      [userId]
    );
    if (!account) throw new Error("Không tìm thấy tài khoản REAL");
    if (parseFloat(account.balance) < parseFloat(amount))
      throw new Error(`Số dư REAL không đủ. Có: ${account.balance}, Cần rút: ${amount}`);

    const otp = await saveOTP(userId);
    await sendOTP(user.email, otp, "withdraw");
    return { message: `Mã OTP đã gửi tới ${user.email}. Có hiệu lực 5 phút.` };
  },

  async verifyWithdraw(userId, amount, otp) {
    const [user] = await q(
      "SELECT verify_code, verify_code_expires FROM users WHERE user_id=?",
      [userId]
    );
    if (!user) throw new Error("Không tìm thấy user");
    checkOTP(user, otp);

    return transaction(async (run) => {
      const [account] = await run(
        "SELECT * FROM accounts WHERE user_id=? AND account_type='REAL' FOR UPDATE",
        [userId]
      );
      if (!account) throw new Error("Không tìm thấy tài khoản REAL");
      if (parseFloat(account.balance) < parseFloat(amount))
        throw new Error(`Số dư REAL không đủ. Có: ${account.balance}, Cần rút: ${amount}`);

      await run("UPDATE accounts SET balance=balance-? WHERE account_id=?", [amount, account.account_id]);

      const refCode = "WD" + Date.now();
      await run(
        "INSERT INTO transactions (account_id, amount, type, status, reference_code) VALUES (?, ?, 'WITHDRAW', 'COMPLETED', ?)",
        [account.account_id, amount, refCode]
      );
      await clearOTP(userId);

      return { message: "Rút tiền REAL thành công", amount, reference_code: refCode };
    });
  },

  // ── LỊCH SỬ GIAO DỊCH ────────────────────────────────────────────────────
  //
  // accountType = 'REAL' → trả lịch sử nạp/rút tiền (bảng transactions)
  // accountType = 'DEMO' → trả lịch sử lệnh đã đóng (bảng orders)
  //                        vì DEMO không có tiền thật nên không có transactions
  //
  async getHistory(userId, accountType = "REAL") {

    if (accountType === "REAL") {
      // Lịch sử nạp/rút tiền thật của tài khoản REAL
      return q(
        `SELECT
           t.transaction_id AS id,
           t.amount,
           t.type,
           t.status,
           t.reference_code,
           t.created_at,
           'TRANSACTION' AS record_type
         FROM transactions t
         JOIN accounts a ON t.account_id = a.account_id
         WHERE a.user_id = ? AND a.account_type = 'REAL'
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [userId]
      );
    }

    // Lịch sử lệnh đã đóng của tài khoản DEMO
    return q(
      `SELECT
         o.order_id   AS id,
         o.side,
         o.volume,
         o.open_price,
         o.close_price,
         o.profit_loss,
         o.opened_at,
         o.closed_at,
         p.symbol,
         p.name,
         'ORDER'      AS record_type
       FROM orders o
       JOIN accounts a ON o.account_id = a.account_id
       JOIN products p ON o.product_id = p.product_id
       WHERE a.user_id = ? AND a.account_type = 'DEMO' AND o.status = 'CLOSED'
       ORDER BY o.closed_at DESC
       LIMIT 50`,
      [userId]
    );
  },
};

module.exports = { Wallet };