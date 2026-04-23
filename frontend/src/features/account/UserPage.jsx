import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/UserPage.css";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";

function AccountBox({ acc }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchData = async (firstLoad = false) => {
    try {
      if (firstLoad) setPageLoading(true);

      const token = localStorage.getItem("token");

      const resB = await axios.get(
        "http://localhost:5000/api/orders/balance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const accounts = resB.data.data || [];
      /*-------dùng /api/orders/balance theo account_id---------------*/
      const currentAccount = accounts.find(
        (item) => item.account_id === acc.account_id
      );

      if (currentAccount) {
        setBalance(currentAccount.equity);
      }
    } catch (err) {
      console.error("Fetch balance error:", err);
    } finally {
      if (firstLoad) setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    /*sau 10000ms = 10s là cập nhật fetchData lại để hiện balance realtime*/
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="account-box">
      <span className={acc.typeAccount === "real" ? "real" : "demo"}>
        <h3>{acc.typeAccount}</h3>
      </span>

      <h3>Standard</h3>

      <p>Number: #{acc.account_id}</p>

      <p>
        Balance:{" "}
        <strong>
          {parseFloat(balance || 0).toFixed(2)} USD
        </strong>
      </p>

      <p>Used Margin: {acc.used_margin || 0} USD</p>
      <p>Leverage: 1:{acc.leverage}</p>

      <button onClick={() => navigate("/MarketPage")}>
        Open
      </button>
    </div>
  );
}

// 2. Dashboard
function Dashboard({ onOpenAccount, accounts, loading }) {
  const [tab, setTab] = useState("real");

  const filteredAccounts = accounts.filter(
    (acc) => acc.typeAccount === tab
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
          <p style={{ color: "#fff", padding: "20px" }}>
            Loading data...
          </p>
        ) : filteredAccounts.length > 0 ? (
          filteredAccounts.map((acc) => (
            <AccountBox key={acc.account_id} acc={acc} />
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

  const handleButton = async (e) => {
    e.preventDefault();

    if (!radio) {
      alert("Vui lòng chọn loại tài khoản");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      await axios.post(
        "http://localhost:5000/api/auth/open-account",
        {
          leverage: 100,
          typeAccount: radio, // 👈 gửi real/demo
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(`Mở tài khoản ${radio} thành công!`);

      if (refreshAccounts) await refreshAccounts();

      setPage("dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi server");
    }
  };

  return (
    <form className="open-account" onSubmit={handleButton}>
      <h1>Open account</h1>

      <label className="account-card">
        <div
          className="account-real"
          onClick={() => setRadio("real")}
        >
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

        <div
          className="account-demo"
          onClick={() => setRadio("demo")}
        >
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