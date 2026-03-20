import React from 'react'
import "../styles/MarketPage.css"

export default function MarketPage() {
  return (
    <div class="marketPage-container">
        <header>
            <div class="logo">Nova</div>
            <div class="symbol">XAU/USD</div>
            <div class="balance">0.00 USD</div>
            <button class="deposit">Deposit</button>
        </header>

        <main class="market-container">

            <nav class="sidebar">
            <ul>
                <li class ="active">XAU/USD</li>
                <li>BTC/USD</li>
                <li>EUR/USD</li>
            </ul>
            </nav>

            <section class="chart">
            <div class="chart-placeholder">
                BIỂU ĐỒ GIÁ
            </div>
            </section>

            <aside class="trade">
                <h3>XAU/USD</h3>

                <div class="price">
                    <button class="sell">SELL <br/> 0.00</button>
                    <button class="buy">BUY <br/> 0.16</button>
                </div>

                <label>Volume</label><input type="number" defaultValue="0.01" />
                <label>Take Profit</label><input type="number" defaultValue="0.00" />
                <label>Stop Loss</label><input type="number" defaultValue="0.00" />


            </aside>

        </main>

        <section class="orders">
            <h3>Opening</h3>
            <table>
            <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Lot</th>
                <th>Open price</th>
                <th>Current price</th>
                <th>T/P</th>
                <th>S/L</th>
                <th>P/L,USD</th>
            </tr>
            <tr>
                <td>XAU/USD</td>
                <td class ="type">SELL</td>
                <td>0.01</td>
                <td>5,596.703</td>
                <td>4,450.920</td>
                <td>4,440</td>
                <td>5,501.500</td>
                <td class="profit">+1,145.28</td>
            </tr>
            </table>
        </section>
    </div>
  )
}

