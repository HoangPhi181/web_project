import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';

export default function Dashboard() {
  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />

        <h2 className="ad-title">Dashboard</h2>

        <div className="ad-grid">
          <div className="ad-card">
            <p>Users</p>
            <h2>1,240</h2>
          </div>

          <div className="ad-card">
            <p>Volume (24h)</p>
            <h2>$450,000</h2>
          </div>

          <div className="ad-card">
            <p>Pending Withdraw</p>
            <h2 className="danger">08</h2>
          </div>
        </div>

        <div className="ad-box">
          Chart / Orders here
        </div>
      </div>
    </div>
  );
}