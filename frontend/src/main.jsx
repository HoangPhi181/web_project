import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";


import HomePage from "./pages/HomePage";
import Login_Register from "./pages/Login_Register";
import UserPage from "./pages/UserPage";
import MarketPage from "./pages/MarketPage";
import HistoryPage from "./pages/HistoryPage";
import PaymentPage from "./pages/PaymentPage";
import PerformancePage from "./pages/PerformancePage";
import QRPage from "./pages/QRPage";
import WithdrawalPage from "./pages/WithdrawalPage";
import PriceChart from "./pages/PriceChart";
import ProfilePage from "./pages/ProfilePage";

import Dashboard from "./pages/admin/Dashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import VerifyRequests from "./pages/admin/VerifyRequests";
import CreateCode from "./pages/admin/CreateCode";


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
        <Route path="/QRPage" element={<QRPage />} />
        <Route path="/ProfilePage" element={<ProfilePage />} />
        <Route path="/WithdrawalPage" element={<WithdrawalPage />} />
        <Route path="/PriceChart" element={<PriceChart />} />

        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/verify" element={<VerifyRequests />} />
        <Route path="/admin/code" element={<CreateCode />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);