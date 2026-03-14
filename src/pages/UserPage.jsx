import React from 'react'
import "../styles/UserPage.css"

export default function UserPage() {
  return (
    <div class ="container">
        <header class ="header">
            <div class="logo">Nova</div>
        </header>

        <main class="user-container">
            <nav class="sidebar">
            <ul>
                <button>Giao dịch</button>
                <ul class = "items">
                    <li>Tài sản của tôi</li>
                    <li>Hiệu năng</li>
                    <li>hiệu năng</li>   
                </ul>
                <button>Các tài khoản thanh toán</button>
                <ul class = "items">
                    <li>Nạp tiền</li>
                    <li>Rút tiền</li>
                </ul>
            </ul>
            </nav>

            <section class="amount">
            <div class="account">
                <h1>Tài sản của tôi
                    <button class = "addAccount">+ mở tài khoản</button>
                </h1>
                <button class = "real">thực</button>
                <button class = "demo">thử nghiệm</button>
            </div>
            </section>

            <div class="account-box">
                <h3>Standard</h3>
                <p>Minium deposit: </p>
                <p>Spread from: </p>
                <p>Commission: </p>
                <button>Open</button>
            </div>

        </main>
    </div>
  )
}
