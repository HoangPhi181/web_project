import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import "./index.css";
import useOnlineStatus from "./hooks/useOnlineStatus";

import Layout from "./component/Layout";
import AdminLayout from "./features/admin/AdminLayout";

import HomePage from "./features/home/HomePage";
import Login_Register from "./features/auth/Login_Register";
import ForgotAccount from "./features/auth/ForgotAccount";
import UserPage from "./features/account/UserPage";
import MarketPage from "./features/trading/MarketPage";
import HistoryPage from "./features/account/HistoryPage";
import PaymentPage from "./features/payment/PaymentPage";
import PerformancePage from "./features/account/PerformancePage";
import WithdrawalPage from "./features/payment/WithdrawalPage";
import ProfilePage from "./features/account/ProfilePage";
import QRPage from "./features/payment/QRPage";

import Dashboard from "./features/admin/Dashboard";
import ManageUsers from "./features/admin/ManageUsers";
import Pending from "./features/admin/Pending";

function getLoggedInUserId() {
  const token = localStorage.getItem("token");
  const raw = localStorage.getItem("userId");
  const session = sessionStorage.getItem("loggedIn");
  if (!token || !raw || !session) return null;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? null : parsed;
}

function App() {
  const [userId, setUserId] = useState(() => getLoggedInUserId());

  useEffect(() => {
    const sync = () => setUserId(getLoggedInUserId());
    window.addEventListener("storage", sync);
    window.addEventListener("auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-change", sync);
    };
  }, []);

  useOnlineStatus(userId);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/HomePage" element={<HomePage />} />
        <Route path="/Login_Register" element={<Login_Register />} />
        <Route path="/forgot-password" element={<ForgotAccount />} />

        <Route path="/MarketPage" element={<MarketPage />} />

        <Route element={<Layout />}>
          <Route path="/UserPage" element={<UserPage />} />
          <Route path="/HistoryPage" element={<HistoryPage />} />
          <Route path="/PerformancePage" element={<PerformancePage />} />
          <Route path="/ProfilePage" element={<ProfilePage />} />
          <Route path="/WithdrawalPage" element={<WithdrawalPage />} />
          <Route path="/PaymentPage" element={<PaymentPage />} />
        </Route>

        <Route path="/QRPage" element={<QRPage />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/pending" element={<Pending />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
