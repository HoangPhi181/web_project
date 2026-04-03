import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import HomePage from "./pages/HomePage";
import Login_Register from "./pages/Login_Register";
import UserPage from "./pages/UserPage";
import MarketPage from "./pages/MarketPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/Login_Register" element={<Login_Register />} />
        <Route path="/UserPage" element={<UserPage />} />
        <Route path="/MarketPage" element={<MarketPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);