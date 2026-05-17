import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="ad-sidebar">
      <h2 className="logo">ADMIN</h2>

      <div className="menu">
        <p className="menu-title">Trading</p>
        <Link to="/admin">Dashboard</Link>
        <Link to="/admin/users">Manage Users</Link>
        <Link to="/admin/verify">Verify Requests</Link>

        <p className="menu-title">System</p>
        <Link to="/admin/code">Create Code</Link>
        <Link to="/admin/pending">Deposit/WithDraw Pending</Link>
      </div>
    </div>
  );
}