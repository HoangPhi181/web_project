import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import profileMediator from '../services/ProfileMediator';
import { balance } from '../api/orderApi';

export default function Header() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [realBalance, setRealBalance] = useState(0);

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
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    params: {
                        type: "REAL"
                    }
                });

                if (res.data?.balance !== undefined) {
                    setRealBalance(res.data.balance);
                } else if (Array.isArray(res.data) && res.data.length > 0) {
                    setRealBalance(res.data[0].balance);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchRealBalance();

        const interval = setInterval(fetchRealBalance, 10000);
        return () => clearInterval(interval);
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
                            localStorage.removeItem("token");
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