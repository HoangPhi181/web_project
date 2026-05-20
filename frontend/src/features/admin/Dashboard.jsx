import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export default function Dashboard() {
  const [pendingCount, setPendingCount] = useState(0);

  const navigation = useNavigate();

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await axiosClient.get("/admin/deposits");

      const pending = (res.data || []).filter(item => item.status === "PENDING").length;

      setPendingCount(pending);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />

        <h2 className="ad-title">Bảng điều khiển quản trị</h2>

        <div className="ad-grid">
          <div
            className="ad-card"
            onClick={() => navigation("/admin/users")}
          >
            <p>Người dùng</p>
            <h2>1,240</h2>
          </div>

          <div
            className="ad-card"
            onClick={() => navigation("/admin/pending")}
          >
            <p>Y/C Nạp tiền chờ duyệt</p>
            <h2 className="danger">{pendingCount}</h2>
          </div>
        </div>

        <div className="ad-box">
          Chart / Orders here
        </div>
      </div>
    </div>
  );
}