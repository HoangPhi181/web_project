import React, { useState } from 'react';
import { register } from '../../api/authApi';

function Register({ onSwitch }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const defaultUsername = `User_${Math.floor(Math.random() * 1000)}`;
            await register({
                username: defaultUsername,
                email,
                password
            });
            alert(`Đăng ký thành công! Tên tạm thời của bạn là: ${defaultUsername}`);
            onSwitch();
        } catch (error) {
            console.log(error.response);
            console.log(error.response?.data);
            alert(error.response?.data?.message || "Đăng ký thất bại");
        }
    };

    return (
        <form className="register-container" onSubmit={handleRegister}>
            <article className="register-form">
                <header>
                    <h1>Đăng ký</h1>
                </header>

                <select name="country" className="country" required>
                    <option value="">Chọn quốc gia</option>
                    <option value="VietNam">Việt Nam</option>
                    <option value="USA">Hoa Kỳ</option>
                    <option value="UK">Vương quốc Anh</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Úc</option>
                </select>

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Mật khẩu"
                    required
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">Đăng ký</button>
                <a href="#" onClick={onSwitch}>Đăng nhập</a>
            </article>

            <aside className="welcome-message-register">
                <h1>WELCOME!</h1>
            </aside>
        </form>
    );
}

export default Register;
