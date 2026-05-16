// backend/mediators/helpers.js
// Hàm dùng chung cho tất cả mediator
// Không chứa logic nghiệp vụ — chỉ là công cụ

const db = require("../db");

// query thường — dùng async/await
const q = (sql, params = []) => db.queryAsync(sql, params);

// Chạy nhiều query trong 1 transaction
// Nếu có lỗi → tự động ROLLBACK, không cần xử lý thủ công
async function transaction(logicFn) {
  const conn = await new Promise((res, rej) =>
    db.getConnection((e, c) => (e ? rej(e) : res(c)))
  );
  const run = (sql, p = []) =>
    new Promise((res, rej) =>
      conn.query(sql, p, (e, r) => (e ? rej(e) : res(r)))
    );
  try {
    await run("START TRANSACTION");
    const result = await logicFn(run);
    await run("COMMIT");
    return result;
  } catch (err) {
    await run("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    conn.release(); // trả connection về pool
  }
}

module.exports = { q, transaction };