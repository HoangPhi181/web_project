import React from "react";
import { Outlet } from "react-router-dom";
import AdminRoute from "./AdminRoute";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <AdminRoute>
    <div className ="ad-wrapper">
      <Sidebar />
      <div className ="ad-main">
        <Header />
        <Outlet />
      </div>
    </div>
    </AdminRoute>
  );
}