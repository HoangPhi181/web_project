import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import { useState } from "react";
import axios from "axios";
import { withdrawRequest, withdrawVerify } from "../../api/transactionApi";
import "../../styles/PaymentPage.css";

function WithdrawalContent() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(0);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  let chenhlechgia = 26300;
  const token = localStorage.getItem("token");

  const requestWithdraw = async (e) => {
    e.preventDefault();

    if (Number(amount) < 15) {
      setShowError(true);
      return;
    }

    setShowError(false);

    try {
      setLoading(true);

      await withdrawRequest({ amount });

      alert("Mã OTP đã được gửi");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi yêu cầu rút tiền");
    } finally {
      setLoading(false);
    }
  };

  const verifyWithdraw = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await withdrawVerify({ amount, otp });

      alert("Rút tiền thành công");
      navigate("/UserPage");
    } catch (err) {
      alert(err.response?.data?.message || "OTP không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={step === 1 ? requestWithdraw : verifyWithdraw}>
      <h2>Rút Tiền:</h2>

      <label>Phương thức chuyển khoản ngân hàng:</label>
      <input type="text" placeholder="Internet Banking" readOnly />

      <label>Mã số thẻ:</label>
      <input type="text" id="paymentMethod" placeholder="0571234561" readOnly />

      <label>Đơn vị tiền tệ</label>
      <input type="text" placeholder="VND" readOnly />

      <label>Từ tài khoản:</label>
      <input type="text" placeholder="REAL Account" readOnly />

      <label>Số tiền:</label>
      <input
        type="number"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          if (Number(e.target.value) >= 15) setShowError(false);
        }}
        required
        disabled={step === 2}
      />

      <p className="note" style={{ color: showError ? "red" : "#13b1e6" }}>
        {showError ? "Số tiền rút tối thiểu là 15 USD" : "15.00 - 10,000.00 USD"}
      </p>

      <span>
        <p>Số tiền cần rút</p>
        <p>{amount * chenhlechgia} VND</p>
      </span>

      {step === 2 && (
        <>
          <label>Mã OTP:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Nhập mã OTP"
            required
          />
        </>
      )}

      <button className="withDrawal" type="submit">
        {loading ? "Đang xử lý..." : step === 1 ? "Gửi OTP" : "Xác nhận rút tiền"}
      </button>
    </form>
  );
}

export default function WithdrawalPage() {
  return (
    <div className="withdrawal-container">
      <div className="withdrawal-layout">
        <WithdrawalContent />
      </div>
    </div>
  );
}