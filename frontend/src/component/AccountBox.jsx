import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserMediator from "../services/UserMediator";

export function AccountBox({ acc }) {
  const [equity, setEquity] = useState(null);
  const navigate = useNavigate();

  const fetchEquity = async () => {
    try {
      const eq = await UserMediator.fetchBalance(acc.account_id, acc.account_type);
      setEquity(eq);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEquity();
    // Cập nhật mỗi 1s → số dư thay đổi khi lệnh lời/lỗ
    const interval = setInterval(fetchEquity, 1000);
    return () => clearInterval(interval);
  }, [acc.account_id]);

  return (
    <div className="account-box">
      <span className={acc.account_type === "REAL" ? "REAL" : "DEMO"}>
        <h3>{acc.account_type}</h3>
      </span>

      <h3>Tiêu chuẩn</h3>
      <p>Mã số: #{acc.account_id}</p>
      <p>
        Số dư:{" "}
        <strong>
          {equity !== null
            ? `${parseFloat(equity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
            : "..."}
        </strong>
      </p>
      <p>Đòn bẩy: 1:{acc.leverage}</p>

      <button onClick={() => {
        localStorage.setItem("accountType", acc.account_type);
        navigate("/MarketPage", { state: { accountType: acc.account_type } });
      }}>Open</button>
    </div>
  );
}
