// backend/mediators/adminMediator.js
// Phân quyền 3 cấp: user < admin < superadmin
//
// Quy tắc đổi role:
//   superadmin → nâng/hạ bất kỳ ai (trừ chính mình và superadmin khác)
//   admin      → chỉ nâng user lên admin, KHÔNG hạ admin về user
//   user       → không có quyền

const { q } = require("./helpers");

const Admin = {

  // GET /api/admin/users
  async getAllUsers() {
    return q(
      `SELECT user_id, username, email, phone, role, status_account, is_online, created_at
       FROM users ORDER BY user_id DESC`
    );
  },

  // GET /api/admin/users/search?phone=...
  async searchByPhone(phone) {
    return q(
      `SELECT user_id, username, email, phone, role, status_account, is_online
       FROM users WHERE phone LIKE ?`,
      [`%${phone}%`]
    );
  },

  // PUT /api/admin/users/:id/block
  // admin và superadmin đều dùng được
  async blockUser(callerId, userId) {
    if (callerId === userId) throw new Error("Không thể tự khóa tài khoản của mình");
    const [user] = await q("SELECT user_id, role FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");
    // Không cho khóa superadmin
    if (user.role === "superadmin") throw new Error("Không thể khóa tài khoản superadmin");
    await q("UPDATE users SET status_account='blocked' WHERE user_id=?", [userId]);
    return { message: "Đã khóa user thành công" };
  },

  // PUT /api/admin/users/:id/unblock
  async unblockUser(callerId, userId) {
    const [user] = await q("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!user) throw new Error("Không tìm thấy user");
    await q("UPDATE users SET status_account='active' WHERE user_id=?", [userId]);
    return { message: "Đã mở khóa user thành công" };
  },

  // PUT /api/admin/users/:id/role
  // callerRole: role của người đang gọi API (lấy từ req.userRole)
  // callerId:   id của người đang gọi API   (lấy từ req.userId)
  async updateRole(callerId, callerRole, userId, newRole) {

    // Validate newRole hợp lệ — superadmin không được đặt qua API
    if (!["user", "admin"].includes(newRole))
      throw new Error("Role chỉ được là 'user' hoặc 'admin'");

    // Không tự đổi role của mình
    if (callerId === userId)
      throw new Error("Không thể tự đổi role của chính mình");

    // Lấy thông tin người được đổi
    const [target] = await q("SELECT user_id, role FROM users WHERE user_id=?", [userId]);
    if (!target) throw new Error("Không tìm thấy user");

    // Không được đụng vào tài khoản superadmin
    if (target.role === "superadmin")
      throw new Error("Không thể thay đổi role của superadmin");

    // ── Kiểm tra quyền theo callerRole ──────────────────────────────────────
    if (callerRole === "admin") {
      // Admin chỉ được nâng user → admin
      // Không được hạ admin → user
      if (target.role === "admin")
        throw new Error("Admin không có quyền hạ cấp admin khác. Chỉ superadmin mới có quyền này.");
    }
    // superadmin không bị giới hạn (đã pass qua đây là được)

    await q("UPDATE users SET role=? WHERE user_id=?", [newRole, userId]);
    return { message: `Đã cập nhật role thành ${newRole} thành công` };
  },

  // GET /api/admin/deposits
  async getPendingDeposits() {
    return q(
      `SELECT t.transaction_id, t.amount, t.reference_code, t.status, t.created_at,
              u.user_id, u.username, u.email, a.account_id
       FROM transactions t
       JOIN accounts a ON t.account_id=a.account_id
       JOIN users    u ON a.user_id=u.user_id
       WHERE t.type='DEPOSIT'
       ORDER BY t.created_at ASC`
    );
  },
};

module.exports = { Admin };