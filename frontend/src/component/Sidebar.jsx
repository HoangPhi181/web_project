import React, {useState} from 'react'
import "../styles/Sidebar.css"
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path) => {
    navigate(path);
  };
  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar-container">
      <nav className="sidebar">
        <ul>
          <li>
            <button>Trading</button>
            <ul className="items">
              <li
                onClick={() => handleClick("/UserPage")}
                className={isActive("/UserPage") ? "active" : ""}
              >
                My account
              </li>
              <li
                onClick={() => handleClick("/PerformancePage")}
                className={isActive("/PerformancePage") ? "active" : ""}
              >
                Performance
              </li>
              <li
                onClick={() => handleClick("/HistoryPage")}
                className={isActive("/HistoryPage") ? "active" : ""}
              >
                History of orders
              </li>
            </ul>
          </li>
          <li>
            <button>Payment & wallet</button>
            <ul className="items">
              <li 
                onClick={() => handleClick("/PaymentPage")}
                className={isActive("/PaymentPage") ? "active" : ""}
              >
                Deposit
              </li>
              <li 
                onClick={() => handleClick("/WithdrawalPage")}
                className={isActive("/WithdrawalPage") ? "active" : ""}
              >
                Withdrawal
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
}