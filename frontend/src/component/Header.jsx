import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Header() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [avatar, setAvatar] = useState(null);

    // Hàm lấy dữ liệu từ Server
    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            // Gọi API profile để lấy đúng avatar của user đang đăng nhập
            const res = await axios.get("http://localhost:5000/api/auth/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Nếu Backend trả về có avatar, cập nhật vào State
            if (res.data && res.data.avatar) {
                setAvatar(res.data.avatar);
            } else {
                setAvatar(null); // Không có ảnh thì để null để dùng ảnh mặc định
            }
        } catch (error) {
            console.error("Lỗi lấy avatar tại Header:", error);
        }
    };

    useEffect(() => {
        fetchProfile();

        // Lắng nghe sự kiện "profileUpdated" để cập nhật ảnh ngay khi user vừa đổi ảnh ở trang cá nhân
        const handleUpdate = () => fetchProfile();
        window.addEventListener("profileUpdated", handleUpdate);
        
        return () => window.removeEventListener("profileUpdated", handleUpdate);
    }, []);

    return (
        <>
            <style>
                {`
                .header{
                    display: flex;
                    align-items: center;
                    height: 60px;
                    padding: 0 20px;
                    gap: 10px;
                    border-bottom: 2px solid #e46033;
                    flex-wrap: wrap;
                    color: white;
                    }
                .logo{
                    font-size: 32px;
                    font-weight: bold;
                    color: #e46033;
                    text-shadow: 0 0 15px #e46033;
                }
                .icon-wallet{
                    margin-left: auto;
                    margin-top: 0px;
                    font-size: 25px;
                }
                .amount-wallet{
                    margin-top: 10px;
                    font-size: 18px;
                    font-weight: bold;
                }

                .icon-user-information{
                    margin-top: 5px;
                    margin-left: 10px;
                    height: 40px;
                    width: 40px;
                    padding: 0px;
                    color: white;
                    background-color: rgba(0,0,0,0.1);
                    border-radius: 50%;
                    overflow: hidden;
                    border: solid 2px white;
                }
                .icon-user-information:hover{
                    border-color: #ffd773;
                    box-shadow: 0 0 20px #e0960d;;
                }
                .icon-user-information img{
                    width: 100%;            
                    height: 100%;
                    object-fit: cover;      
                    display: block;
                }  

                .header {
                    position: relative;
                }
                .dropdown {
                    position: absolute;
                    top: 60px;  
                    right: 20px;
                    background: rgba(0,0,0,0.5);
                    border: solid 2px #e46033;
                    padding: 10px;
                    border-radius: 4px;
                    z-index: 9999;
                    cursor: pointer;
                }
                .dropdown div {
                    padding: 8px 16px;
                    cursor: pointer;
                }
                .dropdown div:hover {
                    background: #e46033;
                    border-radius: 4px;
                }

            `}
            </style>

            <header className="header">
                <div className="logo" onClick={() => navigate("/UserPage")} style={{cursor: 'pointer'}}>Nova</div>
                <div className="icon-wallet">💰</div>
                <div className="amount-wallet">0,00 USD</div>
                
                <button className="icon-user-information" onClick={() => setShow(!show)}>
                    {/* Ưu tiên dùng ảnh từ DB, nếu không có dùng avatar.png mặc định */}
                    <img src={avatar || "avatar.png"} alt="avatar" />
                </button>

                {show && (
                    <div className="dropdown">
                        <div onClick={() => { navigate("/ProfilePage"); setShow(false); }}>Information</div>
                        <div onClick={() => {
                            localStorage.removeItem("token"); // Xóa token khi thoát
                            navigate("/Login_Register");
                        }}>Exit</div>
                    </div>
                )}
            </header>
        </>
    );
}