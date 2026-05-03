import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';

export default function VerifyRequests() {
  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />
        <h2 className="ad-title">Verify Requests</h2>

        <div className="ad-box">
          Pending KYC / Withdraw requests
        </div>
      </div>
    </div>
  );
}