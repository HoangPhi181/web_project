import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MarketPage.css";
import PriceChart from "./PriceChart";

export default function MarketPage() {
  const navigate = useNavigate();
  return (
    <div className="marketPage-container">
        <header>
            <div className="logo">Nova</div>
            <div className="symbol">BTC/USD</div>
            <div className="balance">0.00 USD</div>
            <button className="deposit" onClick = {()=> navigate("/PaymentPage")}>Deposit</button>
        </header>

        <main className="market-container">

            <nav className="sidebar">
            <ul>
                <li className ="active">BTC/USD</li>
                <li>XAU/USD</li>
                <li>EUR/USD</li>
            </ul>
            </nav>

            <section className="chart">
            <div className="chart-placeholder">
                <PriceChart/>
            </div>
            </section>

            <aside className="trade">
                <h3>XAU/USD</h3>

                <div className="price">
                    <button className="sell">SELL <br/> 0.00</button>
                    <button className="buy">BUY <br/> 0.16</button>
                </div>

                <label>Volume</label><input type="number" defaultValue="0.01" />
                <label>Take Profit</label><input type="number" defaultValue="0.00" />
                <label>Stop Loss</label><input type="number" defaultValue="0.00" />


            </aside>

        </main>

        <section className="orders">
            <h3>Opening</h3>
            <table>
            <thead>
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
            </thead>
            <tbody>
            <tr>
                <td>XAU/USD</td>
                <td className ="type">SELL</td>
                <td>0.01</td>
                <td>5,596.703</td>
                <td>4,450.920</td>
                <td>4,440</td>
                <td>5,501.500</td>
                <td className="profit">+1,145.28</td>
            </tr>
            </tbody>
            </table>
        </section>
    </div>
  )
}
