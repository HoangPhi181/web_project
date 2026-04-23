import React, {useState} from 'react'
import "../../styles/Login_Register.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { register } from '../../api/authApi';
import { login } from '../../api/authApi';

function Login({onSwitch}) {
    const navigate = useNavigate(); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    const handleLogin = async (e) => {
        e.preventDefault(); // Ngăn trang web load lại
        try {
            // 2. Gọi API login từ backend
            const res = await login ({
                email,
                password
            });

            // 3. Lưu JWT Token vào localStorage
            localStorage.setItem("token", res.data.token);
            alert("Đăng nhập thành công!");
            
            // 4. Chuyển hướng
            navigate("/UserPage");
        } catch (error) {
            alert(error.response?.data?.message || "Đăng nhập thất bại");
        }
    }


    return (
        <form className="login-container" onSubmit={handleLogin}> 
            <article className="login-form">
                <header>
                    <h1>Login</h1>
                </header>

                <input 
                    type="email" 
                    name="email" 
                    placeholder="Email"
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input 
                    type="password" 
                    name="password" 
                    placeholder="Password"
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type = "submit">Login</button>
                <p>Don't have an account?</p>
                <a href="#" onClick={onSwitch}>Register</a>
            </article>

            <aside className="welcome-message-login">
                <h1>WELCOME BACK!</h1>
                <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
            </aside>
        </form>
    );
}

function Register({onSwitch}) {
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
            alert(error.response?.data?.message || "Đăng ký thất bại");
        }
    }

    return (
        <form className="register-container" onSubmit={handleRegister}>
            <article className="register-form">
                <header>
                    <h1>Register</h1>
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
                    placeholder="Password"
                    required 
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">Register</button>
                <a href="#" onClick={onSwitch}>Login</a>
            </article>

            <aside className="welcome-message-register">
                <h1>WELCOME!</h1>
            </aside>
        </form>
    );
}

export default function Login_Register() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="login-register-container">
            {isLogin ? (
                <Login onSwitch={() => setIsLogin(false)} />
            ) : (
                <Register onSwitch={() => setIsLogin(true)} />
            )}
        </div>
    );
}