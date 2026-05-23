import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div style={{ color: "white", minHeight: "100vh" }}>
      <Header />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
}