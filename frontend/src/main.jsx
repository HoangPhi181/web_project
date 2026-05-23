import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Layout from "./component/Layout";

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
import AdminRoute from "./features/admin/AdminRoute";
import Pending from "./features/admin/Pending";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/HomePage" element={<HomePage />} />
        <Route path="/Login_Register" element={<Login_Register />} />
        <Route path="/forgot-password" element={<ForgotAccount />} />

        {/* market nó có header sidebar riêng*/}
        <Route path="/MarketPage" element={<MarketPage />} />

        {/* Các page CÓ Header + Sidebar dùng chung Layout */}
        <Route element={<Layout />}>
          <Route path="/UserPage" element={<UserPage />} />
          <Route path="/HistoryPage" element={<HistoryPage />} />
          <Route path="/PerformancePage" element={<PerformancePage />} />
          <Route path="/ProfilePage" element={<ProfilePage />} />
          <Route path="/WithdrawalPage" element={<WithdrawalPage />} />
          <Route path="/PaymentPage" element={<PaymentPage />} />
        </Route>
        {/* Trang thanh QR riêng */}
        <Route path="/QRPage" element={<QRPage />} />

        {/* Admin pages */}
        <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
        <Route path="/admin/pending" element={<AdminRoute><Pending /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);