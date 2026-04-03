import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function User_InformationPage() {
  const navigate = useNavigate();

  // state lưu avatar
  const [avatar, setAvatar] = useState(null);

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
        setAvatar(reader.result); 
        localStorage.setItem("avatar", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
        <style>
        {`
            .user-information {
                position: fixed;
                top: 50%;
                left: 55%;
                transform: translate(-45%, -45%);
                width: 100%;
                max-width: 700px;
                background: rgba(0,0,0,0.5);
                border: solid 2px #ccc;
                border-radius: 6px;
                padding: 20px;
            }
            
            .user-information input {
                width: 93%;
                padding: 15px;
                border-radius: 4px;
                margin-left: 10px;
                margin-top: 10px;
                color: white;
                background-color: rgba(0,0,0,0.3);
                border-color: rgba(0,0,0,0.3);
                border: solid 1px #ddd;
            }

            .user-information h1 {
                color: white;
                margin-left: 10px;
            }

            .user-container h3 {
                font-size: 21px;
            }

            .user-information button {
                display: inline;
                width: 48%;
                border-radius: 6px;
                padding: 12px 12px;
                margin-top: 20px;
                margin-left:15px;
            }

            .user-information .exit {
                background-color: #ccc;
                margin-left: 10px;
            }

            .user-information .update {
                color: white;
                background: linear-gradient(90deg, #5f23f8, #e46033);
            }

            .user-information .exit:hover {
                border-color: #ccc;
                box-shadow: 0 0 20px #ccc;
            }

            .user-information .update:hover {
                border-color: #5f23f8;
                box-shadow: 0 0 20px #e46033;
            }
            
            .user-information h1{
                text-align: center;
            }
            .setAvatar img {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid white;
                box-shadow: 0 0 15px rgba(255,255,255,0.4);
                display: block;
                margin: 0 auto;
            }

            .setAvatar .avatar-img:hover {
                transform: scale(1.05);
                box-shadow: 0 0 15px #e46033; /* bóng cam khi hover */
            }
        `}
        </style>
        <Header />
        <Sidebar />
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
                src={avatar || "/avatar.png"} 
                alt="avatar"
                className="avatar-img"
                />
            </label>
        </div>
        <div>

            <input type="text" placeholder="User ID" readOnly />
            <input type="text" placeholder="User name" required />
            <input type="email" placeholder="Email" required />
            <input type="text" placeholder="Created date" readOnly />

            <button className="exit" onClick={() => navigate("/UserPage")}>Exit</button>
            <button className="update" onClick={() => navigate("/UserPage")}>Update</button>
        </div>
        </section>
    </>
  );
}
