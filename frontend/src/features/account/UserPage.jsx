import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/UserPage.css";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import UserMediator from "../../services/UserMediator";
import { AccountBox } from "../../component/AccountBox";

function Dashboard({ onOpenAccount, accounts, loading }) {
  const [tab, setTab] = useState("REAL");
  const filtered = accounts.filter(acc => acc.account_type === tab);

  return (
    <main className="main-container">
      <section className="unit">
        <div className="account">
          <h1>Tài khoản</h1>
          <button className="addAccount" onClick={onOpenAccount}>+ Mở tài khoản</button>

          <div className="btnGroup">
            <button className={tab === "REAL" ? "active" : "unActive"} onClick={() => setTab("REAL")}>Real</button>
            <button className={tab === "DEMO" ? "active" : "unActive"} onClick={() => setTab("DEMO")}>Demo</button>
          </div>
        </div>
      </section>

      <div className="account-list">
        {loading ? <p>Loading...</p> :
          filtered.length ? filtered.map(acc => <AccountBox key={acc.account_id} acc={acc} />) :
          <p>Chưa có tài khoản nào</p>}
      </div>
    </main>
  );
}

function OpenAccount({ setPage, refreshAccounts }) {
  const [radio, setRadio] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();

    if (!radio) return alert("Chọn loại tài khoản");

    try {
      await UserMediator.openAccount(radio);
      await refreshAccounts();
      alert(`Mở ${radio} thành công`);
      setPage("dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi server");
    }
  };

  return (
    <form className="open-account" onSubmit={handleSubmit}>
        <h1>Mở tài khoản</h1>
        <p className="sub-title">
           Chọn loại tài khoản bạn muốn (Thực/Demo)
        </p>

        <div className="account-card">
          {/* Real Account */}
          <div
            className={`account-option ${
              radio === "REAL" ? "selected" : ""
            }`}
            onClick={() => setRadio("REAL")}
          >
            <input
              type="radio"
              name="account"
              checked={radio === "REAL"}
              readOnly
            />

            <h2>Tài khoản thực</h2>
            <h3>Tiêu chuẩn</h3>

            <p>Giao dịch bằng tiền thật</p>
            <p>Số tiền tối thiểu: 10 USD</p>
          </div>

          {/* Demo Account */}
          <div
            className={`account-option ${
              radio === "DEMO" ? "selected" : ""
            }`}
            onClick={() => setRadio("DEMO")}
          >
            <input
              type="radio"
              name="account"
              checked={radio === "DEMO"}
              readOnly
            />

            <h2>Tài khoản Demo</h2>
            <h3>Tiêu chuẩn</h3>

            <p>Thực hành với tiền ảo</p>
            <p>Số dư ban đầu: 10,000 USD</p>
          </div>
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="back"
            onClick={() => setPage("dashboard")}
          >
            Trở về
          </button>
          <button className="continue" type="submit">
            Tiếp tục
          </button>
        </div>
      </form>
  );
}

export default function UserPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await UserMediator.fetchAccounts();
      setAccounts(data);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  return (
    <div className="userPage-container">
      <Header />

      <div className="user-container">
        <Sidebar />

        {page === "openAccount"
          ? <OpenAccount setPage={setPage} refreshAccounts={fetchAccounts} />
          : <Dashboard onOpenAccount={() => setPage("openAccount")} accounts={accounts} loading={loading} />
        }
      </div>
    </div>
  );
}