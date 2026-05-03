import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';

export default function ManageUsers() {
  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />
        <h2 className="ad-title">Manage Users</h2>

        <table className="ad-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>1</td>
              <td>user@gmail.com</td>
              <td>Active</td>
              <td><button>Block</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}