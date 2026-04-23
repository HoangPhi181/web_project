import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";

// 1. Component Bảng - Nhận dữ liệu (data) từ props
function HistoryTable({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Chưa có giao dịch nào được thực hiện.</div>;
  }

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Loại coin</th>
            <th>Loại</th>
            <th>Khối lượng</th>
            <th>Thời gian đóng</th>
            <th>Giá mở</th>
            <th>Giá đóng</th>
            <th>Lợi nhuận (USD)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.order_id}>
              <td>{item.symbol}</td>
              <td className={item.side === "BUY" ? "buy" : "sell"}>
                {item.side}
              </td>
              <td>{Number(item.volume).toFixed(2)}</td>
              <td>{new Date(item.closed_at).toLocaleString('vi-VN')}</td>
              <td>{Number(item.open_price).toFixed(3)}</td>
              <td>{Number(item.close_price).toFixed(3)}</td>
              <td className={item.pnl >= 0 ? "profit" : "loss"}>
                {item.pnl >= 0 ? `+${Number(item.pnl).toFixed(2)}` : Number(item.pnl).toFixed(2)}
              </td>
              
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Menu({ orders, loading }) {
  return (
    <main className="main">
      <h1>Lịch sử giao dịch</h1>
      {loading ? (
        <div style={{ color: "#00ffcc" }}>Đang tải dữ liệu...</div>
      ) : (
        <HistoryTable data={orders} />
      )}
    </main>
  );
}

export default function HistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 3. Hàm lấy dữ liệu từ Backend
  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/orders/history/list",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data) {
        setOrders(res.data.data || res.data); 
      }
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử:", error);
      if (error.response?.status === 401) {
        alert("Phiên đăng nhập hết hạn!");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <>
      <style>
               {`
        .historyPage {
          color: white;
          min-height: 100vh;
        }

        .layout {
          display: grid;
          grid-template-columns: 260px 1fr;
        }

        .main {
          padding: 30px;
        }

        .main h1 {
          margin-bottom: 20px;
        }

        .table-card {
          background: rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 0 25px rgba(0,0,0,0.6);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 14px;
          color: #888;
          border-bottom: 1px solid #222;
        }

        td {
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        tr {
          transition: 0.25s;
        }

        tr:hover {
          background: rgba(255,255,255,0.05);
        }

        .buy {
          color: #00ff99;
          font-weight: bold;
        }

        .sell {
          color: #ff4d4d;
          font-weight: bold;
        }

        .profit {
          color: #00ffcc;
          font-weight: bold;
        }

        .loss {
          color: #ff4d4d;
          font-weight: bold;
        }
        `}
      </style>

      <div className="historyPage">
        <Header />
        <div className="layout">
          <Sidebar />
          <Menu orders={orders} loading={loading} />
        </div>
      </div>
    </>
  );
}