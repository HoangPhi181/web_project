import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

function HistoryTable() {
  const data = [
    { id: 1, pair: "XAU/USD", type: "Buy", lot: 0.1, profit: "+50 USD", time: "10:30" },
    { id: 2, pair: "BTC/USD", type: "Sell", lot: 0.2, profit: "-30 USD", time: "11:00" },
    { id: 3, pair: "EUR/USD", type: "Buy", lot: 0.1, profit: "+20 USD", time: "13:15" },
    { id: 4, pair: "XAU/USD", type: "Sell", lot: 0.3, profit: "+80 USD", time: "15:40" },
  ];

  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Pair</th>
            <th>Type</th>
            <th>Lot</th>
            <th>Profit</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.pair}</td>

              <td className={item.type === "Buy" ? "buy" : "sell"}>
                {item.type}
              </td>

              <td>{item.lot}</td>

              <td className={item.profit.includes("+") ? "profit" : "loss"}>
                {item.profit}
              </td>

              <td>{item.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Menu() {
  return (
    <main className="main">
      <h1>Lịch sử giao dịch</h1>
      <HistoryTable />
    </main>
  );
}

export default function HistoryPage() {
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
          <Menu />
        </div>
      </div>
    </>
  );
}