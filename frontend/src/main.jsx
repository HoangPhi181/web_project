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
import User_InformationPage from "./pages/User_InformationPage";
import WithdrawalPage from "./pages/WithdrawalPage";
import Header from "./pages/Header";
import Sidebar from "./pages/Sidebar";
import PriceChart from "./pages/PriceChart";

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
        <Route path="/User_InformationPage" element={<User_InformationPage />} />
        <Route path="/WithdrawalPage" element={<WithdrawalPage />} />
        <Route path="/Header" element={<Header />} />
        <Route path="/Sidebar" element={<Sidebar />} />
        {/* <Route path="/PriceChart" element={<PriceChart />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);