import React, { useState } from 'react';
import "../../styles/Login_Register.css";
import Login from './Login';
import Register from './Register';

export default function Login_Register() {
    const [isLogin, setIsLogin] = useState(true);
 
    return (
        <div className="login-register-container">
            <div className={`flip-inner${isLogin ? "" : " flipped"}`}>
                <Login onSwitch={() => setIsLogin(false)} />
                <Register onSwitch={() => setIsLogin(true)} />
            </div>
        </div>
    );
}