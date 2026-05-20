import React from "react";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
function Menu() {
  return (
    <main className="main-container">
      <h1>Hiệu suất giao dịch</h1>

      <div className="stats">
        <div className="card profit">
          <p>Tổng lợi nhuận</p>
          <h2>+1,250 USD</h2>
        </div>

        <div className="card win">
          <p>Tỉ lệ thắng</p>
          <h2>68%</h2>
        </div>

        <div className="card trades">
          <p>Tổng lệnh</p>
          <h2>124</h2>
        </div>

        <div className="card drawdown">
          <p>Drawdown</p>
          <h2>-12%</h2>
        </div>
      </div>

      <div className="chart">
        <div className="chart-bar" style={{ height: "40%" }}></div>
        <div className="chart-bar" style={{ height: "60%" }}></div>
        <div className="chart-bar" style={{ height: "50%" }}></div>
        <div className="chart-bar" style={{ height: "80%" }}></div>
        <div className="chart-bar" style={{ height: "70%" }}></div>
        <div className="chart-bar" style={{ height: "90%" }}></div>
      </div>
    </main>
  );
}

export default function PerformancePage() {
  return (
    <>
      <style>
        {`
        .performancePage-container {
          color: white;
        }

        .performance-container {
          display: grid;
          grid-template-columns: 260px 1fr;
        }

        .main-container {
          padding: 30px;
        }

        .main-container h1 {
          margin-bottom: 20px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .card {
          background: rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }

        .card p {
          color: #aaa;
          margin-bottom: 10px;
        }

        .card h2 {
          font-size: 22px;
        }

        .profit h2 {
          color: #00ff99;
        }

        .win h2 {
          color: #00ccff;
        }

        .trades h2 {
          color: #ffcc00;
        }

        .drawdown h2 {
          color: #ff4444;
        }

        .chart {
          height: 300px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          padding: 20px;
        }

        .chart-bar {
          width: 30px;
          background: linear-gradient(180deg, #ff6a00, #ff2e00);
          border-radius: 6px;
        }
        `}
      </style>

      <div className="performancePage-container">
        <Header />
        <div className="performance-container">
          <Sidebar />
          <Menu />
        </div>
      </div>
    </>
  );
}