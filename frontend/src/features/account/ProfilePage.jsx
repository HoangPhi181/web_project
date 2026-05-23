import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../../component/Sidebar";
import Header from "../../component/Header";
import profileMediator from "../../services/ProfileMediator";
import { profile, update_profile } from '../../api/authApi';
import "../../styles/Account.css";

export default function ProfilePage() {
    const navigate = useNavigate();

    // lấy avatar từ localStorage khi load lại trang
    useEffect(() => {
        const saved = localStorage.getItem("avatar");
        if (saved) {
            setUserData(prev => ({
                ...prev,
                avatar: saved
            }));
        }
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
