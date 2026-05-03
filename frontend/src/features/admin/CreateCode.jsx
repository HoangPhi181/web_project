import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';

export default function CreateCode() {
  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />
        <h2 className="ad-title">Create Code</h2>

        <div className="ad-box">
          <input placeholder="Enter code..." />
          <button>Create</button>
        </div>
      </div>
    </div>
  );
}