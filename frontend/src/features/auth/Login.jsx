import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { login } from '../../api/authApi';

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split(".")[1];
        // Chuyển base64url → base64 chuẩn
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        // Padding nếu thiếu
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
        return JSON.parse(atob(padded));
    } catch (e) {
        console.error("Không thể decode JWT:", e);
        return null;
    }
}

// Lấy userId từ payload
function extractUserId(payload) {
    return payload?.id ?? payload?.userId ?? payload?.user_id ?? payload?.sub ?? null;
}

function Login({ onSwitch }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res   = await login({ email, password });
            const token = res.data.token;

            const payload = decodeJwtPayload(token);
            if (!payload) {
                alert("Token không hợp lệ, vui lòng thử lại.");
                return;
            }

            const userId = extractUserId(payload);
            if (!userId) {
                console.warn("Không tìm thấy userId trong payload:", payload);
            }

            localStorage.setItem("token",  token);
            localStorage.setItem("userId", String(userId)); 
            localStorage.setItem("user",   JSON.stringify(payload));

            alert("Đăng nhập thành công!");

            if (payload.role === "admin" || payload.role === "superadmin") {
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
