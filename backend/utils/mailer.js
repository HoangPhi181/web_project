// backend/utils/mailer.js
const axios = require("axios");

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

async function sendOTP(toEmail, otp, type = "withdraw") {
  const content = buildEmailContent(otp, type);

  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: { 
        name: "Trading Nova", 
        email: "n23dccn181@student.ptithcm.edu.vn"
      },
      to: [{ email: toEmail }],
      subject: content.subject,
      htmlContent: `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:auto;
                    padding:32px; border:1px solid #e2e8f0; border-radius:12px;">
          <h2 style="color:#1e293b;">${content.title}</h2>
          <p style="color:#64748b;">${content.desc}</p>
          <div style="font-size:40px; font-weight:bold; letter-spacing:14px;
                      color:#0ea5e9; text-align:center; padding:24px;
                      background:#f0f9ff; border-radius:8px; margin:20px 0;">
            ${otp}
          </div>
          <p style="color:#64748b; font-size:13px;">⏱ Mã có hiệu lực trong <strong>5 phút</strong>.</p>
          <p style="color:#ef4444; font-size:13px;">⚠️ ${content.warning}</p>
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">
          <p style="color:#94a3b8; font-size:11px; text-align:center;">
            Trading Nova Platform — Email tự động, vui lòng không reply.
          </p>
        </div>
      `,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = { sendOTP };