import React, { useState } from "react";
import "../styles/UserPage.css";
import { useNavigate } from "react-router-dom";

function Header({onClickUserInfo}) {
  return (
    <header className="header">
      <div className="logo">Nova</div>
      <div className="icon-wallet">icon</div>
      <div className="amount-wallet">0.00 USD</div>
      <button className="icon-user-information" onClick={onClickUserInfo}>icon</button>
    </header>
  );
}

function Sidebar() {
  return (
    <nav className="sidebar">
      <ul>
        <li>
          <button>Trading</button>
          <ul className="items">
            <li>My account</li>
            <li>Performance</li>
            <li>History of orders</li>
          </ul>
        </li>

        <li>
          <button>Payment & wallet</button>
          <ul className="items">
            <li>Deposit</li>
            <li>Withdrawal</li>
          </ul>
        </li>
      </ul>
    </nav>
  );
}

function AccountBox() {
  const navigate = useNavigate();

  return (
    <div className="account-box">
      <h3>Standard</h3>
      <h3 className="accountID">#ID</h3>
      <p>Minimum deposit:</p>
      <p>Spread from:</p>
      <p>Commission:</p>

      <button onClick={() => navigate("/MarketPage")}>Open</button>
    </div>
  );
}

function Dashboard({ onOpenAccount }) {
  return (
    <main className="main-container">
      <section className="unit">
        <div className="account">
          <h1>My accounts</h1>

          <button className="addAccount" onClick={onOpenAccount}>
            + Open account
          </button>

          <div className="btnGroup">
            <button className="real">Real</button>
            <button className="demo">Demo</button>
          </div>
        </div>
      </section>

      <AccountBox />

      <footer>
        <p>
          © 2026 Nova Trading Platform. All rights reserved. Trading involves risk.
          This website is designed to provide users with a modern and efficient trading experience. 
          Trading financial markets involves risk, and users should carefully consider their investment objectives before making any decisions.
        </p>
      </footer>
    </main>
  );
}

function OpenAccount({setPage}) {
  return (
    <section className="open-account">
      <h1>Open account</h1>

      <label className="account-card">
        <div className="account-real">
          <input type="radio" name="account" />
          <h2>Real</h2>
          <h3>Standard</h3>
          <p>Low minimum deposit with no commission</p>
          <p>Min deposit: 10 USD</p>
        </div>

        <div className="account-demo">
          <input type="radio" name="account" />
          <h2>Demo</h2>
          <h3>Standard</h3>
          <p>Low minimum deposit with no commission</p>
          <p>Min deposit: 10 USD</p>
        </div>
      </label>

      <button class ="continue" onClick={()=>setPage("dashboard")}>Continue</button>
      <button class = "back" onClick={()=>setPage("dashboard")}>Back</button>
    </section>
  );
}

function UserInfo({setPage}) {
  return (
    <section className="user-information">
      <div>
        <h1>User Information</h1>

        <span id="userID">userID</span>

        <input type="text" placeholder="User name" required />
        <input type="email" placeholder="Email" required />

        <span id="createAt">createAt</span>

        <button className="exit" onClick={()=>setPage("dashboard")}>Exit</button>
        <button className="update" onClick={()=>setPage("dashboard")}>Update</button>
      </div>
    </section>
  );
}

export default function UserPage() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "openAccount":
        return <OpenAccount setPage={setPage} />;

      case "userInfo":
        return <UserInfo setPage={setPage} />;

      default:
        return <Dashboard onOpenAccount={() => setPage("openAccount")} />;
    }
  };

  return (
    <div className="userPage-container">
      <Header onClickUserInfo={() => setPage("userInfo")} />

      <div className="user-container">
        <Sidebar />
        {renderPage()}
      </div>
    </div>
  );

}