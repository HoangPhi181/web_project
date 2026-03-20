import React from 'react'
import "../styles/UserPage.css"

export default function UserPage() {
  return (
    <div class ="userPage-container">
        <header class ="header">
            <div class="logo">Nova</div>
            <div class="icon-wallet">"icon"</div>
            <div class="amount-wallet">0.00 USD</div>
            <button class="icon-user-information">"icon"</button>
        </header>

        <div class="user-container">
            <nav class="sidebar">
                <ul>
                <li>
                    <button>Trading</button>
                    <ul class="items">
                    <li>My account</li>
                    <li>Performance</li>
                    <li>History of orders</li>
                    </ul>
                </li>

                <li>
                    <button>Payment & wallet</button>
                    <ul class="items">
                    <li>Deposit</li>
                    <li>Withdrawal</li>
                    </ul>
                </li>
                </ul>
            </nav>

            <main class="main-container">
                <section class="unit">
                <div class="account">
                    <h1>My accounts</h1>
                    <button class = "addAccount">+ Open account</button>
                    <div class="btnGroup">
                        <button class = "real">Real</button>
                        <button class = "demo">Demo</button>
                    </div>
                </div>
                </section>

                <div class="account-box">
                    <h3>Standard</h3>
                    <h3 class="accountID">#ID</h3>
                    <p>Minium deposit: </p>
                    <p>Spread from: </p>
                    <p>Commission: </p>
                    <button>Open</button>
                </div>

                <footer>
                <p>
                © 2026 Nova Trading Platform. All rights reserved. 
                This website is designed to provide users with a modern and efficient trading experience. 
                Trading financial markets involves risk, and users should carefully consider their investment objectives before making any decisions. 
                Nova does not provide financial advice and is not responsible for any losses incurred.
                </p>
                </footer>
            </main>

            <main class="open-account">
                <h1>Open account</h1>
                <label className="account-card">
                    <div class ="account-real">
                        <input type="radio" name="account" />
                        <h2>Real</h2>
                        <h3>Standard</h3>
                        <p>Low minimum deposit with no commission. Made for all traders</p>
                        <p>Min deposit: 10 USD</p>
                    </div>
                    
                    <div class ="account-demo">
                        <input type="radio" name="account" />
                        <h2>Demo</h2>
                        <h3>Standard</h3>
                        <p>Low minimum deposit with no commission. Made for all traders</p>
                        <p>Min deposit: 10 USD</p>
                    </div>

                </label>
                <button>Continue</button>
            </main>

            <main class="user-information">
                <div>
                    <h1>User Information</h1>

                    <span id ="userID">userID</span>
                    <input 
                    type="userName" 
                    id="userName" 
                    name="userName" 
                    placeholder="User name"
                    required />

                     <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Email"
                    required />
                    <span id ="crateAt">creatAt</span>
                    
                    <button class="exit">Exit</button>
                    <button class="update">Update</button>
                </div>

            </main>


        </div>
    </div>
  )
}
