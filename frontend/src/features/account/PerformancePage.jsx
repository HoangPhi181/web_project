import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import { history } from "../../api/orderApi";
import "../../styles/Account.css";

function computeStats(orders) {
  if (!orders.length)
    return { totalPnL: 0, winRate: "0.0", totalOrders: 0, drawdown: "0.0", wins: 0, losses: 0 };

  let totalPnL = 0, wins = 0, losses = 0, peak = 0, maxDrop = 0, running = 0;

  orders.forEach((o) => {
    const pnl = parseFloat(o.profit_loss ?? 0);
    totalPnL += pnl;
    running  += pnl;
    if (running > peak) peak = running;
    const drop = peak - running;
    if (drop > maxDrop) maxDrop = drop;
    if (pnl >= 0) wins++;
    else losses++;
  });

  return {
    totalPnL,
    wins,
    losses,
    totalOrders: orders.length,
    winRate:  ((wins / orders.length) * 100).toFixed(1),
    drawdown: peak > 0 ? ((maxDrop / peak) * 100).toFixed(1) : "0.0",
  };
}

// Biểu đồ lời lỗ 7 ngày
function computeDailyChart(orders) {
  const map = {};

  orders.forEach((o) => {
    const date = new Date(o.closed_at);
    const key  = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = { profit: 0, loss: 0 };
    const pnl = parseFloat(o.profit_loss ?? 0);
    if (pnl >= 0) map[key].profit += pnl;
    else          map[key].loss   += Math.abs(pnl);
  });

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({
      day:    key,
      profit: map[key]?.profit || 0,
      loss:   map[key]?.loss   || 0,
    });
  }
  return result;
}

export default function PerformancePage() {
  const [stats,       setStats]       = useState(null);
  const [chartData,   setChartData]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [accountType, setAccountType] = useState("REAL");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await history({ params: { type: accountType } });
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setStats(computeStats(list));
      setChartData(computeDailyChart(list));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accountType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtPnL = (v) => {
    const n = parseFloat(v);
    return `${n >= 0 ? "+" : ""}${n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`;
  };

  const maxVal = chartData.length
    ? Math.max(...chartData.flatMap((d) => [d.profit, d.loss]), 1)
    : 1;

  return (
    <div className="performance-page">
      <div className="performance-layout">
        <main className="performance-main">
          <h1>Hiệu suất giao dịch</h1>

          {/* Tab REAL / DEMO */}
          <div className="account-tabs">
            {["REAL", "DEMO"].map((t) => (
              <button
                key={t}
                onClick={() => setAccountType(t)}
                className={`tab-btn${accountType === t ? " active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-text">Đang tính toán...</div>
          ) : stats ? (
            <>
              {/* 4 Card thống kê */}
              <div className="stats-grid">
                <div className="stat-card">
                  <p>Tổng lợi nhuận</p>
                  <h2 className="stat-pnl">{fmtPnL(stats.totalPnL)}</h2>
                </div>
                <div className="stat-card">
                  <p>Tỉ lệ thắng</p>
                  <h2 className="stat-winrate">{stats.winRate}%</h2>
                </div>
                <div className="stat-card">
                  <p>Tổng lệnh</p>
                  <h2 className="stat-orders">{stats.totalOrders}</h2>
                </div>
                <div className="stat-card">
                  <p>Drawdown</p>
                  <h2 className="stat-drawdown">-{stats.drawdown}%</h2>
                </div>
              </div>

              {/* Biểu đồ 7 ngày */}
              <div className="chart-section">
                <p className="chart-title">P&amp;L 7 ngày gần nhất</p>

                {/* Bars */}
                <div className="chart-bars">
                  {chartData.map((d, i) => (
                    <div key={i} className="chart-bar-group">
                      <div className="chart-bar-pair">
                        {/* Cột Lời */}
                        <div
                          className={`bar-profit${d.profit > 0 ? " has-value" : ""}`}
                          title={`Lời: +${d.profit.toFixed(2)}`}
                          style={{
                            height: d.profit > 0
                              ? `${Math.max((d.profit / maxVal) * 200, 6)}px`
                              : "2px",
                          }}
                        />
                        {/* Cột Lỗ */}
                        <div
                          className={`bar-loss${d.loss > 0 ? " has-value" : ""}`}
                          title={`Lỗ: -${d.loss.toFixed(2)}`}
                          style={{
                            height: d.loss > 0
                              ? `${Math.max((d.loss / maxVal) * 200, 6)}px`
                              : "2px",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Labels ngày */}
                <div className="chart-labels">
                  {chartData.map((d, i) => (
                    <div key={i} className="chart-label">{d.day}</div>
                  ))}
                </div>

                {/* Chú thích */}
                <div className="chart-legend">
                  <span className="legend-profit">■ Lời</span>
                  <span className="legend-loss">■ Lỗ</span>
                </div>
              </div>
            </>
          ) : (
            <p className="no-data-text">Không có dữ liệu.</p>
          )}
        </main>
      </div>
    </div>
  );
}