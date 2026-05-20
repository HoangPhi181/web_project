import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserMediator from "../services/UserMediator";

export function AccountBox({ acc }) {
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();

  const fetchBalance = async () => {
    try {
      const equity = await UserMediator.fetchBalance(acc.account_id);
      setBalance(equity);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalance();
    //cập nhật giá sau 60s
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="account-box">
      <span className={acc.account_type === "REAL" ? "REAL" : "DEMO"}>
        <h3>{acc.account_type}</h3>
      </span>

      <h3>Tiêu chuẩn</h3>
      <p>Mã số: #{acc.account_id}</p>
      <p>Số dư: <strong>{parseFloat(acc.balance).toFixed(2)} USD</strong></p>
      <p>Ký quỹ: {acc.used_margin || 0} USD</p>
      <p>Đòn bẩy: 1:{acc.leverage}</p>

      <button onClick={() => {
          localStorage.setItem("accountType", acc.account_type);
          navigate("/MarketPage", { state: { accountType: acc.account_type }})
        }}>Open</button>
    </div>
  );
}