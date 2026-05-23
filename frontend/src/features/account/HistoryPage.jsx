import React, { useState, useEffect } from "react";
import { history } from "../../api/orderApi";
import "../../styles/Account.css";

function HistoryTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">Chưa có giao dịch nào được thực hiện.</div>;
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
              <td>{new Date(item.closed_at).toLocaleString("vi-VN")}</td>
              <td>{Number(item.open_price).toFixed(3)}</td>
              <td>{Number(item.close_price).toFixed(3)}</td>
              <td className={item.profit_loss >= 0 ? "profit" : "loss"}>
                {item.profit_loss >= 0
                  ? `+${Number(item.profit_loss).toFixed(2)}`
                  : Number(item.profit_loss).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Menu({
  orders, loading, page, totalPages,
  handlePrev, handleNext,
  filterType, setFilterType,
  sortBy, setSortBy,
  accountType, setAccountType,
}) {
  return (
    <main className="main">
      <h1>Lịch sử giao dịch</h1>

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

      {/* Filter + Sort */}
      <div className="controls">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">Tất cả</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="NEWEST">Mới nhất</option>
          <option value="OLDEST">Cũ nhất</option>
          <option value="PROFIT_HIGH">Profit cao nhất</option>
          <option value="PROFIT_LOW">Profit thấp nhất</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-text">Đang tải dữ liệu...</div>
      ) : (
        <>
          <HistoryTable data={orders} />

          <div className="pagination">
            <button onClick={handlePrev} disabled={page === 1}>Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button onClick={handleNext} disabled={page === totalPages}>Sau</button>
          </div>
        </>
      )}
    </main>
  );
}

export default function HistoryPage() {
  const [allOrders,   setAllOrders]   = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [filterType,  setFilterType]  = useState("ALL");
  const [sortBy,      setSortBy]      = useState("NEWEST");
  const [accountType, setAccountType] = useState("REAL");

  const limit = 8;

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res  = await history({ params: { type: accountType } });
      const data = res.data?.data || res.data || [];
      setAllOrders(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử:", error);
      if (error.response?.status === 401) alert("Phiên đăng nhập hết hạn!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [accountType]);

  useEffect(() => {
    let processed = [...allOrders];

    if (filterType !== "ALL") {
      processed = processed.filter((item) => item.side === filterType);
    }

    switch (sortBy) {
      case "NEWEST":      processed.sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at)); break;
      case "OLDEST":      processed.sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at)); break;
      case "PROFIT_HIGH": processed.sort((a, b) => b.profit_loss - a.profit_loss); break;
      case "PROFIT_LOW":  processed.sort((a, b) => a.profit_loss - b.profit_loss); break;
      default: break;
    }

    const start = (page - 1) * limit;
    setOrders(processed.slice(start, start + limit));
  }, [page, allOrders, filterType, sortBy]);

  const filteredOrders = filterType === "ALL"
    ? allOrders
    : allOrders.filter((item) => item.side === filterType);

  const totalPages = Math.ceil(filteredOrders.length / limit) || 1;

  const handlePrev = () => { if (page > 1)            setPage(page - 1); };
  const handleNext = () => { if (page < totalPages)   setPage(page + 1); };

  return (
    <Menu
      orders={orders}
      loading={loading}
      page={page}
      totalPages={totalPages}
      handlePrev={handlePrev}
      handleNext={handleNext}
      filterType={filterType}
      setFilterType={setFilterType}
      sortBy={sortBy}
      setSortBy={setSortBy}
      accountType={accountType}
      setAccountType={setAccountType}
    />
  );
}