import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import profileMediator from '../../services/ProfileMediator';
export default function Header() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [avatar, setAvatar] = useState(null);

    useEffect(() => {
        // subscribe nhận data từ mediator
        const handleProfile = (profile) => {
            setAvatar(profile?.avatar || null);
        };

        profileMediator.subscribe(handleProfile);

        // gọi mediator fetch
        profileMediator.fetchProfile();

        return () => profileMediator.unsubscribe(handleProfile);
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
            <div className="logo" onClick={() => navigate("/admin")}>
                Nova
            </div>

            <div className="icon-wallet"/>
            <div className="amount-wallet"/>

            <button className="icon-user-information" onClick={() => setShow(!show)}>
                <img src={avatar || "avatar.png"} alt="avatar" />
            </button>

            {show && (
                <div className="dropdown">
                    <div onClick={() => navigate("/ProfilePage")}>
                        Information
                    </div>
                    <div onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userId");
                        localStorage.removeItem("user");
                        sessionStorage.removeItem("loggedIn");
                        window.dispatchEvent(new Event("auth-change"));
                        navigate("/Login_Register");
                    }}>
                        Exit
                    </div>
                </div>
            )}
        </header>
        </>
    );
}