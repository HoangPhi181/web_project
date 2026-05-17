import React, { useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function ForgotAccount() {

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // gửi OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();

    try {

      setLoading(true);

      const res = await axiosClient.post(
        "/auth/forgot-password",
        {
          email
        }
      );

      alert(res.data.message || "Đã gửi OTP về email");

      setStep(2);

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Gửi OTP thất bại"
      );

    } finally {
      setLoading(false);
    }
  };

  // reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    try {

      setLoading(true);

      const res = await axiosClient.post(
        "/auth/reset-password",
        {
          email,
          otp,
          new_password: newPassword
        }
      );

      alert(
        res.data.message ||
        "Đổi mật khẩu thành công"
      );

      window.location.href = "/Login_Register";

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "OTP không đúng"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
        .forgot-container{
          width:100%;
          min-height:100vh;
          background:#0f172a;
          display:flex;
          justify-content:center;
          align-items:center;
          color:white;
        }

        .forgot-card{
          width:400px;
          background:#111827;
          padding:30px;
          border-radius:20px;
          box-shadow:0 0 30px rgba(0,0,0,0.5);
        }

        .forgot-card h1{
          margin-bottom:20px;
          text-align:center;
        }

        .forgot-card form{
          display:flex;
          flex-direction:column;
          gap:15px;
        }

        .forgot-card input{
          padding:14px;
          border:none;
          border-radius:10px;
          outline:none;
          background:#1f2937;
          color:white;
        }

        .forgot-card button{
          padding:14px;
          border:none;
          border-radius:10px;
          background:#00ffcc;
          color:black;
          font-weight:bold;
          cursor:pointer;
        }

        .forgot-card button:disabled{
          opacity:0.5;
          cursor:not-allowed;
        }
        `}
      </style>

      <div className="forgot-container">

        <div className="forgot-card">

          <h1>Quên mật khẩu</h1>

          {
            step === 1 ? (

              <form onSubmit={handleSendOTP}>

                <input
                  type="email"
                  placeholder="Nhập email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                >
                  {
                    loading
                    ? "Đang gửi..."
                    : "Gửi mã OTP"
                  }
                </button>

              </form>

            ) : (

              <form onSubmit={handleResetPassword}>

                <input
                  type="text"
                  placeholder="Nhập mã OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                >
                  {
                    loading
                    ? "Đang xử lý..."
                    : "Đổi mật khẩu"
                  }
                </button>

              </form>

            )
          }

        </div>

      </div>
    </>
  );
}