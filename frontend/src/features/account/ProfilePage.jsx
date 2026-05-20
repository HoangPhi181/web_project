import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import AdminSidebar from '../admin/Sidebar';
import AdminHeader from '../admin/Header';
import AdminLayout from '../admin/AdminLayout';
import profileMediator from "../../services/ProfileMediator";
import { profile, update_profile } from '../../api/authApi';

export default function ProfilePage() {
    const navigate = useNavigate();

    // lấy avatar từ localStorage khi load lại trang
    useEffect(() => {
        const saved = localStorage.getItem("avatar");
        if (saved) setAvatar(saved);
    }, []);

    // khi chọn ảnh & lưu kết quả 
    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Lưu trực tiếp vào state userData để tí nữa gửi đi cùng lúc
                setUserData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

  // ---------------------------lấy thông tin từ backend------------------------------------------
    const [userData, setUserData] = useState({
        user_id: '',
        username: '',
        email: '',
        phone: '',
        created_at: ''
    });
    const isAdmin = userData.role === "admin" || userData.role === "superadmin";

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    navigate("/login");
                    return;
                }

                // ĐÚNG: Gọi vào /api/auth/profile
                const res = await profile();

                // console.log("Dữ liệu nhận được:", res.data);
                setUserData(res.data); 
            } catch (error) {
                console.error("Lỗi lấy thông tin user:", error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    navigate("/login");
                }
            }
        };

        fetchUserData();
    }, [navigate]);

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return alert("Vui lòng đăng nhập lại!");

            const res = await update_profile({
                username: userData.username,
                email: userData.email,
                phone: userData.phone,
                avatar: userData.avatar // Gửi chuỗi Base64 lên Database
            });

            alert("Cập nhật thành công!");
            profileMediator.redirectHome(navigate);
            // navigate("/UserPage");
        } catch (error) {
            console.error(error);
                console.log(error.response?.data);
    console.log(error.response?.status);
            alert(error.response?.data?.message || "Cập nhật thất bại");
        }
    };
    // ------------------------------------------------------------------------------------------
    return (
    <>
        <style>
        {`
            .user-information {
                position: fixed;
                top: 52%;
                left: 55%;
                transform: translate(-50%, -50%);
                width: 100%;
                max-width: 500px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 30px 30px 30px 30px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                color: white;
            }

            .user-information h1 {
                text-align: center;
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 25px;
            }

            .setAvatar img {
                width: 140px;
                height: 140px;
                border-radius: 50%;
                object-fit: cover;
                display: block;
                margin: 0 auto 35px auto;
                border: 4px solid #333;
                outline: 3px solid #ffd773;
                outline-offset: 4px;
                box-shadow: 0 0 30px rgba(255, 215, 115, 0.2);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .setAvatar img:hover {
                transform: rotate(10deg) scale(1.05);
                outline-color: #ff9f43;
            }

            .user-information input {
                width: 100%;
                box-sizing: border-box;
                padding: 12px 15px;
                border-radius: 8px;
                margin-bottom: 15px;
                color: white;
                background: rgba(255, 255, 255, 0.07);
                border: 1px solid rgba(255, 255, 255, 0.1);
                outline: none;
                transition: all 0.3s ease;
            }

            .user-information input:focus {
                background: rgba(255, 255, 255, 0.12);
                border-color: #e46033;
            }

            .user-information .button-group {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                margin-top: 10px;
            }

            .user-information button {
                flex: 1;
                border: none;
                border-radius: 8px;
                padding: 12px 95px;
                // margin-right: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }

            .user-information .exit {
                background-color: rgba(255, 255, 255, 0.1);
                color: #a0a0a0;
            }

            .user-information .exit:hover {
                color: white;
                border: solid 1px white;
            }

            .user-information .update {
                color: black;
                background: linear-gradient(90deg, #e46033, #ffd773);
            }

            .user-information .update:hover {
                border: solid 1px #e49d33;
                color: white;
                box-shadow: 0 5px 15px rgba(228, 96, 51, 0.4);
            }

            @media (max-height: 600px) {
                .user-information {
                    top: 20%;
                    left: 50%;
                    transform: translate(-50%, 0);
                    margin: 20px 0;
                    position: absolute;
                }
            }
        `}
        </style>
        
        {/* <Header />
        <Sidebar /> */}
        {isAdmin ? <AdminHeader /> : <Header />}
        {isAdmin ? <AdminSidebar /> : <Sidebar />}
        <section className="user-information">
        <h1>Thông tin cá nhân</h1>
        <div className="setAvatar">
            {/* input file ẩn */}
            <input 
                type="file" 
                id="avatarUpload" 
                onChange={handleChange} 
                style={{ display: "none" }} 
            />

            {/* label đóng vai trò nút, click vào sẽ mở input */}
            <label htmlFor="avatarUpload">
                <img
                    src={userData.avatar || "/avatar.png"} 
                    alt="avatar"
                    className="avatar-img"
                    onError={(e) => { e.target.src = "/avatar.png"; }}
                />
            </label>
        </div>
        <div>
            <div>
                <input 
                    type="text" 
                    placeholder="User ID" 
                    value={userData.user_id ? `user${String(userData.user_id).padStart(3, '0')}` : ''} 
                    readOnly 
                />

                <input 
                    type="text" 
                    placeholder="User name" 
                    value={userData.username || ''}
                    required 
                    onChange={(e) => setUserData({...userData, username: e.target.value})}
                />

                <input 
                    type="email" 
                    placeholder="Email" 
                    value={userData.email || ''} 
                    required 
                    onChange={(e) => setUserData({...userData, email: e.target.value})}
                />

                <input 
                    type="phone" 
                    placeholder="Phone" 
                    value={userData.phone || ''} 
                    required 
                    onChange={(e) => setUserData({...userData, phone: e.target.value})}
                />

                <input 
                    type="text" 
                    placeholder="Created date" 
                    value={userData.created_at ? new Date(userData.created_at).toLocaleDateString('vi-VN') : ''} 
                    readOnly 
                />

                <div className="button-group">
                    <button className="exit" onClick={() => profileMediator.redirectHome(navigate)}>Thoát</button>
                    <button className="update" onClick={handleUpdate}>Cập nhật</button>
                </div>
            </div>
        </div>
        </section>
    </>
  );
}
