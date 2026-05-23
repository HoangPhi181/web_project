import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import profileMediator from '../services/ProfileMediator';
import { balance } from '../api/orderApi';

export default function Header() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [realBalance, setRealBalance] = useState(0);
    const wsRef = useRef(null);

    useEffect(() => {
        const handleProfile = (profile) => {
            setAvatar(profile?.avatar || null);
        };
        profileMediator.subscribe(handleProfile);
        profileMediator.fetchProfile();
        return () => profileMediator.unsubscribe(handleProfile);
    }, []);

    useEffect(() => {
        const fetchRealBalance = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await balance({
                    headers: { Authorization: `Bearer ${token}` },
                    params:  { type: "REAL" }
                });
                // Dùng equity (= balance + floating PnL) để số hiển thị thay đổi khi lệnh lời/lỗ
                // balance gốc không thay đổi khi mở/đóng lệnh (chỉ thay đổi khi đóng lệnh)
                const list = res.data?.data || (Array.isArray(res.data) ? res.data : [res.data]);
                const acc  = list[0] || {};
                const eq   = parseFloat(acc.equity ?? acc.balance ?? 0);
                setRealBalance(eq);
            } catch (err) { console.error(err); }
        };
        fetchRealBalance();
        const interval = setInterval(fetchRealBalance, 10000);
        return () => clearInterval(interval);
    }, []);

    // Gửi identify WebSocket khi user ở bất kỳ trang nào có Header
    // → server đánh dấu online; khi unmount (đăng xuất/đóng tab) → offline
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const wsUrl = (import.meta.env?.VITE_WS_URL) || "ws://localhost:5000";
        const ws    = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "identify", userId: parseInt(userId) }));
        };
        ws.onerror  = () => {};
        ws.onclose  = () => {};

        return () => {
            // Cleanup khi trang unmount
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <>
            <style>
                {`
                .header{
                    display:flex;
                    align-items:center;
                    height:60px;
                    padding:0 20px;
                    gap:10px;
                    border-bottom:2px solid #e46033;
                    flex-wrap:wrap;
                    color:white;
                }
                .logo{
                    font-size:32px;
                    margin-top:12px;
                    font-weight:bold;
                    color:#e46033;
                    text-shadow:0 0 15px #e46033;
                }
                .icon-wallet{
                    margin-left:auto;
                    margin-top:-10px;
                    font-size:25px;
                }
                .amount-wallet{
                    margin-top:0;
                    font-size:18px;
                    font-weight:bold;
                }
                .icon-user-information{
                    margin-top:-5px;
                    margin-left:10px;
                    height:40px;
                    width:40px;
                    padding:0;
                    color:white;
                    background-color:rgba(0,0,0,0.1);
                    border-radius:50%;
                    overflow:hidden;
                    border:solid 2px white;
                }
                .icon-user-information:hover{
                    border-color:#ffd773;
                    box-shadow:0 0 20px #e0960d;
                }
                .icon-user-information img{
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block;
                }
                .header{ position:relative; }
                .dropdown{
                    position:absolute;
                    top:60px;
                    right:20px;
                    background:rgba(0,0,0,0.5);
                    border:solid 2px #e46033;
                    padding:10px;
                    border-radius:4px;
                    z-index:9999;
                    cursor:pointer;
                }
                .dropdown div{
                    padding:8px 16px;
                    cursor:pointer;
                }
                .dropdown div:hover{
                    background:#e46033;
                    border-radius:4px;
                }
                `}
            </style>

            <header className="header">
                <div className="logo" onClick={() => navigate("/UserPage")}>
                    Nova
                </div>

                <div className="icon-wallet">💰</div>
                <div className="amount-wallet">
                    {Number(realBalance).toFixed(2)} USD
                </div>

                <button className="icon-user-information" onClick={() => setShow(!show)}>
                    <img src={avatar || "avatar.png"} alt="avatar" />
                </button>

                {show && (
                    <div className="dropdown">
                        <div onClick={() => navigate("/ProfilePage")}>
                            Thông tin
                        </div>

                        <div onClick={() => {
                            // Đóng WS → server nhận disconnect → đánh dấu offline
                            if (wsRef.current) wsRef.current.close();
                            localStorage.removeItem("token");
                            localStorage.removeItem("userId");
                            localStorage.removeItem("user");
                            navigate("/Login_Register");
                        }}>
                            Đăng xuất
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}