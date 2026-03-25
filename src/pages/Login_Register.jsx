import React, { useState } from 'react'
import "../styles/Login_Register.css";

export default function Login_Register() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    country: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          alert('Đăng nhập thành công!');
          // Redirect to dashboard or home
          window.location.href = '/market';
        } else {
          alert('Đăng ký thành công! Vui lòng đăng nhập.');
          setIsLogin(true);
        }
      } else {
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Không thể kết nối đến server');
    }
  };

  return (
    <div className="login-register-container">
        <div className={`login-container ${isLogin ? '' : 'hidden'}`}> 
            <article className="login-form">
                <header>
                    <h1>Login</h1>
                </header>

                <form onSubmit={handleSubmit}>
                  <input 
                      type="email" 
                      name="email" 
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required />

                  <input 
                      type="password" 
                      name="password" 
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required />

                  <button type="submit">Login</button>
                </form>
                <p>Don't have an account?</p>
                <a href="#" onClick={() => setIsLogin(false)}>Register</a>
            </article>

            <aside className="welcome-message-login">
                <h1>WELCOME BACK!</h1>
                <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
            </aside>
        </div>

        <div className={`register-container ${!isLogin ? '' : 'hidden'}`}>
            <article className="register-form">
                <header>
                    <h1>Register</h1>
                </header>
                <form onSubmit={handleSubmit}>
                  <input 
                      type="text" 
                      name="username" 
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required />

                  <input 
                      type="email" 
                      name="email" 
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required />

                  <input 
                      type="password" 
                      name="password" 
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required />

                  <select name="country" value={formData.country} onChange={handleInputChange} className="country" required>
                      <option value="">Chọn quốc gia</option>
                      <option value="VietNam">Việt Nam</option>
                      <option value="USA">Hoa Kỳ</option>
                      <option value="UK">Vương quốc Anh</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Úc</option>
                  </select>

                  <button type="submit">Register</button>
                </form>
                <a href="#" onClick={() => setIsLogin(true)}>Login</a>
            </article>

            <aside className="welcome-message-register">
                <h1>WELCOME!</h1>
            </aside>

            {error && <p className="error-message">{error}</p>}
        </div>
    </div>
  )
}
