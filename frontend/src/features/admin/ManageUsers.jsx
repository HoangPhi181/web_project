import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/Admin.css';
import axiosClient from '../../api/axiosClient';

export default function ManageUsers() {

  const [users, setUsers] = useState([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [sortBy, setSortBy] = useState("id-asc");
  const [filterBy, setFilterBy] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const usersPerPage = 12;

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axiosClient.get("/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUsers(
        Array.isArray(res.data)
          ? res.data
          : res.data
          ? [res.data]
          : []
      );

    } catch (err) {
      console.error(err);
      alert("Không thể tải danh sách user");
    }
  };

  const handleSearch = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!searchPhone.trim()) {
        fetchUsers();
        return;
      }

      const res = await axiosClient.get(
        `/admin/users/search?phone=${searchPhone}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setUsers(
        Array.isArray(res.data)
          ? res.data
          : res.data
          ? [res.data]
          : []
      );

      setCurrentPage(1);

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Không tìm thấy user");
    }
  };

  const handleBlock = async (userId) => {
    try {
      const token = localStorage.getItem("token");

      await axiosClient.put(
        `/admin/users/${userId}/block`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchUsers();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Khóa user thất bại");
    }
  };

  const handleUnblock = async (userId) => {
    try {
      const token = localStorage.getItem("token");

      await axiosClient.put(
        `/admin/users/${userId}/unblock`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchUsers();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Mở khóa user thất bại");
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      const token = localStorage.getItem("token");

      await axiosClient.put(
        `/admin/users/${userId}/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      fetchUsers();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Cập nhật role thất bại");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  let processedUsers = [...users];

  if (filterBy === "active") {
    processedUsers = processedUsers.filter(
      user => user.status_account !== "blocked"
    );
  }

  if (filterBy === "blocked") {
    processedUsers = processedUsers.filter(
      user => user.status_account === "blocked"
    );
  }

  if (filterBy === "user") {
    processedUsers = processedUsers.filter(
      user => user.role === "user"
    );
  }

  if (filterBy === "admin") {
    processedUsers = processedUsers.filter(
      user => user.role === "admin"
    );
  }

  processedUsers.sort((a, b) => {
    switch (sortBy) {
      case "id-desc":
        return b.user_id - a.user_id;

      case "email-asc":
        return a.email.localeCompare(b.email);

      case "email-desc":
        return b.email.localeCompare(a.email);

      default:
        return a.user_id - b.user_id;
    }
  });

  const indexOfLast = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;

  const currentUsers = processedUsers.slice(
    indexOfFirst,
    indexOfLast
  );

  const totalPages = Math.ceil(
    processedUsers.length / usersPerPage
  );

  return (
    <div className="ad-wrapper">
      <div className="ad-main">
        <h2 className="ad-title">Quản lý người dùng</h2>

        <div className='find'>
          <input
            type='phone'
            placeholder='phone'
            value={searchPhone}
            onChange={(e) => {
              setSearchPhone(e.target.value);

              if (!e.target.value.trim()) {
                fetchUsers();
              }
            }}
          />

          <button onClick={handleSearch}>
            🔍️
          </button>

          <select
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="blocked">Đã khóa</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="id-asc">ID tăng dần</option>
            <option value="id-desc">ID giảm dần</option>
            <option value="email-asc">Email A-Z</option>
            <option value="email-desc">Email Z-A</option>
          </select>

        </div>

        <table className="ad-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Trạng thái</th>
              <th>Hoạt động</th>
              <th>Vai trò</th>
            </tr>
          </thead>

          <tbody>

            {currentUsers.map((user, index) => (
              <tr key={user.user_id || index}>
                <td>{user.user_id}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>

                <td>
                  {user.status_account === "blocked"
                    ? "Đã khóa"
                    : "Hoạt động"}
                </td>

                <td>
                  <div className="btn-group">

                    <button
                      onClick={() =>
                        handleBlock(user.user_id)
                      }
                    >
                      Khóa
                    </button>

                    <button
                      onClick={() =>
                        handleUnblock(user.user_id)
                      }
                    >
                      Mở khóa
                    </button>

                  </div>
                </td>

                <td>
                  <div className="rd-group">

                    <label>
                      <input
                        type="radio"
                        name={`role-${user.user_id}`}
                        checked={user.role === "user"}
                        onChange={() =>
                          handleUpdateRole(
                            user.user_id,
                            "user"
                          )
                        }
                      />
                      User
                    </label>

                    <label>
                      <input
                        type="radio"
                        name={`role-${user.user_id}`}
                        checked={user.role === "admin"}
                        onChange={() =>
                          handleUpdateRole(
                            user.user_id,
                            "admin"
                          )
                        }
                      />
                      Admin
                    </label>

                  </div>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

        <div className="pagination">

          {Array.from(
            { length: totalPages },
            (_, i) => (

              <button
                key={i}
                className={
                  currentPage === i + 1
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCurrentPage(i + 1)
                }
              >
                {i + 1}
              </button>
            )
          )}

        </div>

      </div>
    </div>
  );
}