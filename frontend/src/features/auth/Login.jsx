import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { login } from '../../api/authApi';
import { jwtDecode } from "jwt-decode";

function Login({ onSwitch }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await login({ email, password });
            const token = res.data.token;
            const decoded = jwtDecode(token);
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(decoded));
            alert("Đăng nhập thành công!");
            if (decoded.role === "admin" || decoded.role === "superadmin") {
                navigate("/admin");
            } else {
                navigate("/UserPage");
            }
        } catch (error) {
            alert(error.response?.data?.message || "Đăng nhập thất bại");
        }
    };

    return (
        <form className="login-container" onSubmit={handleLogin}>
            <article className="login-form">
                <header><h1>Đăng nhập</h1></header>

                <input
                    type="email"
                    placeholder="Email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Mật khẩu"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">Đăng nhập</button>

                <div className="login-footer">
                    <p onClick={() => navigate("/forgot-password")}>Quên mật khẩu?</p>
                    <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }}>
                        Đăng ký
                    </a>
                </div>
            </article>

            <aside className="welcome-message-login">
                <h1>WELCOME BACK!</h1>
                <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
            </aside>
        </form>
    );
}

export default Login;