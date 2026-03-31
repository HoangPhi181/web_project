import React, {useState} from 'react'
import "../styles/Login_Register.css";
import { useNavigate } from "react-router-dom";

function Login({onSwitch}) {
    const navigate = useNavigate(); 
    return (
        <form className="login-container"> 
            <article className="login-form">
                <header>
                    <h1>Login</h1>
                </header>

                <input 
                    type="email" 
                    name="email" 
                    placeholder="Email"
                    required 
                />

                <input 
                    type="password" 
                    name="password" 
                    placeholder="Password"
                    required 
                />

                <button onClick={()=>navigate("/UserPage")}>Login</button>
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
    return (
        <form className="register-container">
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
                />

                <input 
                    type="password" 
                    name="password" 
                    placeholder="Password"
                    required 
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