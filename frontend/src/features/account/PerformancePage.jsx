import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../component/Sidebar";
import Header  from "../../component/Header";
import { history } from "../../api/orderApi";

function computeStats(orders) {
  if (!orders.length) return { totalPnL: 0, winRate: "0.0", totalOrders: 0, drawdown: "0.0", wins: 0, losses: 0 };
  let totalPnL = 0, wins = 0, losses = 0, peak = 0, maxDrop = 0, running = 0;
  orders.forEach(o => {
    const pnl = parseFloat(o.profit_loss ?? 0);
    totalPnL += pnl; running += pnl;
    if (running > peak) peak = running;
    const drop = peak - running;
    if (drop > maxDrop) maxDrop = drop;
    if (pnl >= 0) wins++; else losses++;
  });
  return {
    totalPnL, wins, losses, totalOrders: orders.length,
    winRate:  ((wins / orders.length) * 100).toFixed(1),
    drawdown: peak > 0 ? ((maxDrop / peak) * 100).toFixed(1) : "0.0",
  };
}

// Biểu đồ lời lỗ 7 ngày 
function computeDailyChart(orders) {
  // Tạo map từ orders
  const map = {};
  orders.forEach(o => {
    const date = new Date(o.closed_at);
    const key  = `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}`;
    if (!map[key]) map[key] = { profit: 0, loss: 0 };
    const pnl = parseFloat(o.profit_loss ?? 0);
    if (pnl >= 0) map[key].profit += pnl;
    else          map[key].loss   += Math.abs(pnl);
  });


  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [accountType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtPnL = (v) => {
    const n = parseFloat(v);
    return `${n >= 0 ? "+" : ""}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const maxVal = chartData.length ? Math.max(...chartData.flatMap(d => [d.profit, d.loss]), 1) : 1;

  return (
    <div style={{ color: "white", minHeight: "100vh" }}>
      <Header />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        <Sidebar />
        <main style={{ padding: 30 }}>
          <h1 style={{ marginBottom: 20 }}>Hiệu suất giao dịch</h1>

          {/* Tab REAL / DEMO */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {["REAL", "DEMO"].map(t => (
              <button key={t} onClick={() => setAccountType(t)} style={{
                padding: "6px 20px", borderRadius: 6, cursor: "pointer",
                fontWeight: 700, fontSize: 13, border: "1px solid #334155",
                background: accountType === t ? "#c0392b" : "rgba(255,255,255,0.05)",
                color: accountType === t ? "white" : "#94a3b8",
              }}>{t}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: "#00ffcc" }}>Đang tính toán...</div>
          ) : stats ? (
            <>
              {/* 4 Card thống kê */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 30 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
                  <p style={{ color: "#aaa", marginBottom: 10, fontSize: 14 }}>Tổng lợi nhuận</p>
                  <h2 style={{ color: "#00ff99", fontSize: 22 }}>{fmtPnL(stats.totalPnL)}</h2>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
                  <p style={{ color: "#aaa", marginBottom: 10, fontSize: 14 }}>Tỉ lệ thắng</p>
                  <h2 style={{ color: "#00ccff", fontSize: 22 }}>{stats.winRate}%</h2>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
                  <p style={{ color: "#aaa", marginBottom: 10, fontSize: 14 }}>Tổng lệnh</p>
                  <h2 style={{ color: "#ffcc00", fontSize: 22 }}>{stats.totalOrders}</h2>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
                  <p style={{ color: "#aaa", marginBottom: 10, fontSize: 14 }}>Drawdown</p>
                  <h2 style={{ color: "#ff4444", fontSize: 22 }}>-{stats.drawdown}%</h2>
                </div>
              </div>

              {/* Biểu đồ 7 ngày */}
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "24px 24px 16px" }}>
                <p style={{ color: "#aaa", marginBottom: 16, fontSize: 13 }}>
                  P&amp;L 7 ngày gần nhất
                </p>

                {/* Bars */}
                <div style={{ display: "flex", alignItems: "flex-end", height: 220, gap: 8, marginBottom: 8 }}>
                  {chartData.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", width: "100%" }}>
                        {/* Cột Lời */}
                        <div
                          title={`Lời: +${d.profit.toFixed(2)}`}
                          style={{
                            flex: 1,
                            height: d.profit > 0 ? `${Math.max((d.profit / maxVal) * 200, 6)}px` : "2px",
                            background: d.profit > 0
                              ? "linear-gradient(180deg, #00ff99, #00cc66)"
                              : "rgba(255,255,255,0.08)",
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.4s ease",
                          }}
                        />
                        {/* Cột Lỗ */}
                        <div
                          title={`Lỗ: -${d.loss.toFixed(2)}`}
                          style={{
                            flex: 1,
                            height: d.loss > 0 ? `${Math.max((d.loss / maxVal) * 200, 6)}px` : "2px",
                            background: d.loss > 0
                              ? "linear-gradient(180deg, #ff6a00, #ff2e00)"
                              : "rgba(255,255,255,0.08)",
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Labels ngày */}
                <div style={{ display: "flex", gap: 8 }}>
                  {chartData.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#888" }}>{d.day}</div>
                  ))}
                </div>

                {/* Chú thích */}
                <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "#00ff99" }}>■ Lời</span>
                  <span style={{ fontSize: 12, color: "#ff6a00" }}>■ Lỗ</span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: "#aaa" }}>Không có dữ liệu.</p>
          )}
        </main>
      </div>
    </div>
  );
}
