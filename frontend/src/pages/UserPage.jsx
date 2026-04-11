import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/UserPage.css";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

// 1. Account Box (GIỮ NGUYÊN UI)
function AccountBox({ acc, type }) {
  const navigate = useNavigate();

  return (
    <div className="account-box">
      <span className={type === "real" ? "real" : "demo"}><h3>{type}</h3></span>
      <h3>Standard</h3>

      <p>Number: #{acc.account_id}</p>
      <p>
        Balance:{" "}
        <strong>
          {acc.balance ? parseFloat(acc.balance).toFixed(2) : "0.00"} USD
        </strong>
      </p>
      <p>Used Margin: {acc.used_margin || 0} USD</p>
      <p>Leverage: 1:{acc.leverage}</p>

      <button onClick={() => navigate("/MarketPage")}>Open</button>
    </div>
  );
}

// 2. Dashboard
function Dashboard({ onOpenAccount, accounts, loading }) {
  const [tab, setTab] = useState("real");

  // 👉 Fake logic tạm: account đầu là real, còn lại là demo
  const filteredAccounts = accounts.filter((acc, index) =>
    tab === "real" ? index === 0 : index !== 0
  );

  return (
    <main className="main-container">
      <section className="unit">
        <div className="account">
          <h1>My accounts</h1>

          <button className="addAccount" onClick={onOpenAccount}>
            + Open account
          </button>

          <div className="btnGroup">
            <button
              className={tab === "real" ? "active" : "unActive"}
              onClick={() => setTab("real")}
            >
              Real
            </button>

            <button
              className={tab === "demo" ? "active" : "unActive"}
              onClick={() => setTab("demo")}
            >
              Demo
            </button>
          </div>
        </div>
      </section>

      <div className="account-list">
        {loading ? (
          <p style={{ color: "#fff", padding: "20px" }}>Loading data...</p>
        ) : filteredAccounts.length > 0 ? (
          filteredAccounts.map((acc) => (
            <AccountBox key={acc.account_id} acc={acc} type={tab} />
          ))
        ) : (
          <p style={{ color: "#aaa", padding: "20px" }}>
            Chưa có tài khoản nào.
          </p>
        )}
      </div>

      <footer>
        <p>
          © 2026 Nova Trading Platform. All rights reserved. Trading involves
          risk. This website is designed to provide users with a modern and
          efficient trading experience.
        </p>
      </footer>
    </main>
  );
}

// 3. Open Account
function OpenAccount({ setPage, refreshAccounts }) {
  const [radio, setRadio] = useState("");

  // Trong component OpenAccount (UserPage.jsx)
  const handleButton = async (e) => {
      e.preventDefault();
      if (!radio) { alert("Vui lòng chọn loại tài khoản"); return; }

      const token = localStorage.getItem("token");
      try {
          // Đổi sang .post và đúng đường dẫn mới
          await axios.post(
              "http://localhost:5000/api/auth/open-account",
              { leverage: 100 }, // Bạn có thể thêm trường type: radio nếu cần
              { headers: { Authorization: `Bearer ${token}` } }
          );

          alert(`Mở tài khoản ${radio} thành công!`);
          if (refreshAccounts) await refreshAccounts(); // Load lại danh sách Dashboard
          setPage("dashboard");
      } catch (err) {
          alert(err.response?.data?.message || "Lỗi server");
      }
  };

  return (
    <form className="open-account" onSubmit={handleButton}>
      <h1>Open account</h1>

      <label className="account-card">
        <div className="account-real" onClick={() => setRadio("real")}>
          <input
            type="radio"
            name="account"
            checked={radio === "real"}
            readOnly
          />
          <h2>Real</h2>
          <h3>Standard</h3>
          <p>Low minimum deposit with no commission</p>
          <p>Min deposit: 10 USD</p>
        </div>

        <div className="account-demo" onClick={() => setRadio("demo")}>
          <input
            type="radio"
            name="account"
            checked={radio === "demo"}
            readOnly
          />
          <h2>Demo</h2>
          <h3>Standard</h3>
          <p>Low minimum deposit with no commission</p>
          <p>Min deposit: 10 USD</p>
        </div>
      </label>

      <button className="continue" type="submit">
        Continue
      </button>

      <button
        type="button"
        className="back"
        onClick={() => setPage("dashboard")}
      >
        Back
      </button>
    </form>
  );
}

// 4. Main Page
export default function UserPage() {
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get(
        "http://localhost:5000/api/auth/account",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ hỗ trợ cả object và array
      if (Array.isArray(res.data)) {
        setAccounts(res.data);
      } else if (res.data) {
        setAccounts([res.data]);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setAccounts([]);
      } else {
        console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAccounts();
  }, []);

  const renderPage = () => {
    switch (page) {
      case "openAccount":
        return (
          <OpenAccount
            setPage={setPage}
            refreshAccounts={fetchAccounts}
          />
        );

      default:
        return (
          <Dashboard
            onOpenAccount={() => setPage("openAccount")}
            accounts={accounts}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="userPage-container">
      <Header />

      <div className="user-container">
        <Sidebar />
        {renderPage()}
      </div>
    </div>
  );
}