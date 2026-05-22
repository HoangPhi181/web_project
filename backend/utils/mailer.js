// backend/utils/mailer.js
// Gửi email OTP qua Brevo SMTP
// Dùng cho 2 chức năng:
//   1. Xác nhận rút tiền  → sendOTP(email, otp, "withdraw")
//   2. Đặt lại mật khẩu  → sendOTP(email, otp, "reset")

const nodemailer = require("nodemailer");

// Kết nối Brevo SMTP
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true,
  family: 4,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Nội dung email theo từng loại
function buildEmailContent(otp, type) {
  if (type === "reset") {
    return {
      subject: "[Trading Nova] Đặt lại mật khẩu",
      title: "Yêu cầu đặt lại mật khẩu",
      desc: "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
      warning: "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
    };
  }

  return {
    subject: "[Trading Nova] Xác nhận rút tiền",
    title: "Xác nhận rút tiền",
    desc: "Mã xác nhận để thực hiện giao dịch rút tiền của bạn.",
    warning: "Không chia sẻ mã này cho bất kỳ ai.",
  };
}

/**
 * Gửi email OTP tới người dùng
 *
 * @param {string} toEmail
 * @param {string} otp
 * @param {string} type
 */
async function sendOTP(toEmail, otp, type = "withdraw") {

  try {

    const content = buildEmailContent(otp, type);

    const info = await transporter.sendMail({
      from: `"Trading Nova" <ac2657001@smtp-brevo.com>`,
      to: toEmail,
      subject: content.subject,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:auto;
                    padding:32px; border:1px solid #e2e8f0; border-radius:12px;">

          <h2 style="color:#1e293b; margin-bottom:4px;">${content.title}</h2>

          <p style="color:#64748b; margin-top:0;">
            ${content.desc}
          </p>

          <div style="font-size:40px; font-weight:bold; letter-spacing:14px;
                      color:#0ea5e9; text-align:center; padding:24px 16px;
                      background:#f0f9ff; border-radius:8px; margin:20px 0;">
            ${otp}
          </div>

          <p style="color:#64748b; font-size:13px; margin:0;">
            ⏱ Mã có hiệu lực trong <strong>5 phút</strong>.
          </p>

          <p style="color:#ef4444; font-size:13px; margin-top:8px;">
            ⚠️ ${content.warning}
          </p>

          <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">

          <p style="color:#94a3b8; font-size:11px; text-align:center; margin:0;">
            Trading Nova Platform — Email tự động, vui lòng không reply.
          </p>

        </div>
      `,
    });

    console.log("EMAIL SENT:", info.messageId);

  } catch (error) {

    console.error("SEND MAIL ERROR:");
    console.error(error);

    throw error;
  }
}

module.exports = { sendOTP };