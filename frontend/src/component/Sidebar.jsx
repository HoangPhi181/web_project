import React, { useState } from 'react';
import "../styles/Sidebar.css";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <button
        className="hamburger"
        onClick={() => setIsOpen(true)}
      >
        ☰
      </button>

      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`sidebar-container ${isOpen ? "open" : ""}`}>
        <nav className="sidebar">
          <ul>
            <li>
              <button>Giao dịch</button>
              <ul className="items">
                <li
                  onClick={() => handleClick("/UserPage")}
                  className={isActive("/UserPage") ? "active" : ""}
                >
                  Tài khoản của tôi
                </li>

                <li
                  onClick={() => handleClick("/PerformancePage")}
                  className={isActive("/PerformancePage") ? "active" : ""}
                >
                  Hiệu suất
                </li>

                <li
                  onClick={() => handleClick("/HistoryPage")}
                  className={isActive("/HistoryPage") ? "active" : ""}
                >
                  Lịch sử đặt lệnh
                </li>
              </ul>
            </li>

            <li>
              <button>Thanh toán</button>

              <ul className="items">
                <li
                  onClick={() => handleClick("/PaymentPage")}
                  className={isActive("/PaymentPage") ? "active" : ""}
                >
                  Nạp tiền
                </li>

                <li
                  onClick={() => handleClick("/WithdrawalPage")}
                  className={isActive("/WithdrawalPage") ? "active" : ""}
                >
                  Rút tiền
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}