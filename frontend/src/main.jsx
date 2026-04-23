import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";


import HomePage from "./features/home/HomePage";
import Login_Register from "./features/auth/Login_Register";
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
import VerifyRequests from "./features/admin/VerifyRequests";
import CreateCode from "./features/admin/CreateCode";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/HomePage" element={<HomePage />} />
        <Route path="/Login_Register" element={<Login_Register />} />
        <Route path="/UserPage" element={<UserPage />} />
        <Route path="/MarketPage" element={<MarketPage />} />
        <Route path="/HistoryPage" element={<HistoryPage />} />
        <Route path="/PaymentPage" element={<PaymentPage />} />
        <Route path="/PerformancePage" element={<PerformancePage />} />
        <Route path="/ProfilePage" element={<ProfilePage />} />
        <Route path="/WithdrawalPage" element={<WithdrawalPage />} />
        <Route path="/QRPage" element={<QRPage />} />

        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/verify" element={<VerifyRequests />} />
        <Route path="/admin/code" element={<CreateCode />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);