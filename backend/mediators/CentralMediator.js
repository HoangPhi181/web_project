// backend/mediators/CentralMediator.js
// File trung tâm — chỉ gom các mediator lại, không chứa logic
//
// Cấu trúc thư mục:
//   mediators/
//     CentralMediator.js  ← file này (route require vào đây)
//     helpers.js          ← q() + transaction() dùng chung
//     authMediator.js     ← đăng ký, đăng nhập, quên mật khẩu
//     tradeMediator.js    ← tạo lệnh, đóng lệnh, P&L, REAL/DEMO
//     walletMediator.js   ← nạp QR, rút OTP, lịch sử
//     adminMediator.js    ← quản lý user, duyệt nạp tiền
//
// Cách dùng ở route:
//   const Mediator = require('../mediators/CentralMediator');
//   await Mediator.Auth.login(email, password)
//   await Mediator.Trade.createOrder(..., 'REAL')
//   await Mediator.Trade.createOrder(..., 'DEMO')
//   await Mediator.Wallet.deposit(userId, amount)
//   await Mediator.Admin.blockUser(adminId, userId)

const { Auth }   = require("./authMediator");
const { Trade }  = require("./tradeMediator");
const { Wallet } = require("./walletMediator");
const { Admin }  = require("./adminMediator");

module.exports = { Auth, Trade, Wallet, Admin };