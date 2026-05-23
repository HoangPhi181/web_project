import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import Header  from './Header';
import '../../styles/Admin.css';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

function OnlineBadge({ count }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#022c22', border: '1px solid #22c55e',
      borderRadius: 20, padding: '3px 12px',
      color: '#22c55e', fontWeight: 700, fontSize: 14,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#22c55e', display: 'inline-block',
        animation: 'pulseGreen 1.5s infinite',
      }} />
      {count} online
    </span>
  );
}

export default function Dashboard() {
  const navigate       = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [userCount,    setUserCount]    = useState('—');
  const [activeUsers,  setActiveUsers]  = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchData();

    const wsUrl = (import.meta.env?.VITE_WS_URL) || 'wss://web-trading-project.onrender.com';
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const userId = localStorage.getItem('userId');
      if (userId) ws.send(JSON.stringify({ type: 'identify', userId: parseInt(userId) }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'active_users') setActiveUsers(msg.count || 0);
        if (msg.type === 'connected')    setActiveUsers(msg.active_users || 0);
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  const fetchData = async () => {
    try {
      const [resDeposits, resUsers] = await Promise.all([
        axiosClient.get('/admin/deposits'),
        axiosClient.get('/admin/users'),
      ]);
      const pending = (resDeposits.data || []).filter(i => i.status === 'PENDING').length;
      setPendingCount(pending);
      setUserCount((resUsers.data || []).filter(u => u.status_account === 'active').length);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ad-wrapper">
      <div className="ad-main">
        <h2 className="ad-title">Bảng điều khiển quản trị</h2>

        <div className="ad-grid">
          <div className="ad-card" onClick={() => navigate('/admin/users')}
            style={{ cursor: 'pointer' }}>
            <p>Người dùng</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <h2 style={{ margin: 0 }}>{userCount}</h2>
              <OnlineBadge count={activeUsers} />
            </div>
          </div>

          {/* Yêu cầu nạp tiền */}
          <div className="ad-card" onClick={() => navigate('/admin/pending')}
            style={{ cursor: 'pointer' }}>
            <p>Y/C Nạp tiền chờ duyệt</p>
            <h2 className="danger" style={{ marginTop: 8 }}>{pendingCount}</h2>
          </div>
        </div>

        <div className="ad-box">Chart / Orders here</div>
      </div>

      <style>{`
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.7); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0);   }
          100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
        }
      `}</style>
    </div>
  );
}
