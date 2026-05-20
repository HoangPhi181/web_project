import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../../styles/admin.css";

export default function Pending() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("PENDING");

  const pageSize = 8;

  const fetchDeposits = async () => {
    try {
      const res = await axiosClient.get("/admin/deposits");
      setDeposits(res.data || []);
    } catch {
      alert("Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const removeDeposit = (id) => {
    setDeposits(prev => prev.filter(x => x.transaction_id !== id));
  };

  const confirmDeposit = async (id) => {
    try {
      await axiosClient.put(`/admin/deposits/${id}/confirm`);
      removeDeposit(id);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xác nhận");
    }
  };

  const rejectDeposit = async (id) => {
    try {
      await axiosClient.put(`/admin/deposits/${id}/reject`);
      removeDeposit(id);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi từ chối");
    }
  };

  const filtered = useMemo(() => {
    return [...deposits]
      .filter(d => d.reference_code?.toLowerCase().includes(search.toLowerCase()) && d.status === filterStatus)
      .sort((a, b) => sortAsc ? a.transaction_id - b.transaction_id : b.transaction_id - a.transaction_id);
  }, [deposits, search, sortAsc, filterStatus]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="ad-wrapper">
      <Sidebar />

      <div className="ad-main">
        <Header />
        <h2>Y/C Nạp tiền</h2>

        <div className="ad-toolbar">
          <input
            placeholder="Search by Reference..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <button className="ad-sort-btn" onClick={() => setSortAsc(!sortAsc)}>
            Sắp xếp {sortAsc ? "↑" : "↓"}
          </button>
        </div>

        <div className="ad-status-tabs">
          {[
            { key: "PENDING", label: "Đang chờ" },
            { key: "COMPLETED", label: "Hoàn thành" },
            { key: "FAILED", label: "Thất bại" }
          ].map(status => (
            <button
              key={status.key}
              className={filterStatus === status.key ? "ad-tab active" : "ad-tab"}
              onClick={() => {
                setFilterStatus(status.key);
                setPage(1);
              }}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div className="ad-table-box">
          <table className="ad-table">
            <thead className="ad-table-head">
              <tr>
                <th className="ad-th">ID</th>
                <th className="ad-th">Tài khoản</th>
                <th className="ad-th">Số tiền</th>
                <th className="ad-th">Mã giao dịch</th>
                <th className="ad-th">Trạng thái</th>
                {filterStatus === "PENDING" && <th className="ad-th">Hoạt động</th>}
              </tr>
            </thead>

            <tbody>
              {paginated.map(tx => (
                <tr key={tx.transaction_id} className="ad-tr">
                  <td className="ad-td">{tx.transaction_id}</td>
                  <td className="ad-td">{tx.account_id}</td>
                  <td className="ad-td">{Number(tx.amount).toLocaleString("vi-VN")} USD</td>
                  <td className="ad-td">{tx.reference_code}</td>

                  <td className="ad-td">
                    <span className={`ad-status ${tx.status.toLowerCase()}`}>
                      {{
                        PENDING: "Đang chờ",
                        COMPLETED: "Hoàn thành",
                        FAILED: "Thất bại"
                      }[tx.status]}
                    </span>
                  </td>

                  {filterStatus === "PENDING" && (
                    <td className="ad-td">
                      <button className="ad-accept-btn" onClick={() => confirmDeposit(tx.transaction_id)}>
                        Chấp thuận
                      </button>

                      <button className="ad-reject-btn" onClick={() => rejectDeposit(tx.transaction_id)}>
                        Từ chối
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {paginated.length === 0 && (
            <div className="ad-empty">No data found</div>
          )}
        </div>

        <div className="ad-pagination">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={page === i + 1 ? "ad-page-btn active" : "ad-page-btn"}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}