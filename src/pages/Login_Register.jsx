import React from 'react'
import "../styles/Login_Register.css";

export default function Login_Register() {
  return (
    <div class="login-register-container">
        <div class="login-container"> 
            <article class ="login-form">
                <header>
                    <h1>Login</h1>
                </header>

                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Email"
                    required />

                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Password"
                    required />

                <button type="submit">Login</button>
                <p>Don't have an account?</p>
                <a href="/Register">Register</a>
            </article>

            <aside class="welcome-message-login">
                <h1>WELCOME BACK!</h1>
                <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
            </aside>
        </div>

        <div class="register-container">
            <article class ="register-form">
                <header>
                    <h1>Register</h1>
                </header>
                <select id="country" name="country" class="country" required>
                    <option value="">Chọn quốc gia</option>
                    <option value="VietNam">Việt Nam</option>
                    <option value="USA">Hoa Kỳ</option>
                    <option value="UK">Vương quốc Anh</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Úc</option>
                </select>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Email"
                    required />

                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Password"
                    required />

                <button type="submit">Register</button>
                    <a href="#">Login</a>
            </article>

            <aside class="welcome-message-register">
                <h1>WELCOME!</h1>
            </aside>

            <p id="error-message" className="error-message"></p>
        </div>
    </div>
  )
}
