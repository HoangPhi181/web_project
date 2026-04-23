import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/MarketPage.css";
import PriceChart from "../../component/PriceChart";
import axios from "axios";

export default function MarketPage() {
    const navigate = useNavigate();

    const products = [
        { id: 1, symbol: "BTC/USD" },
        { id: 2, symbol: "XAU/USD" },
        { id: 3, symbol: "EUR/USD" }
    ];

    // =========================
    // STATE
    // =========================
    const [orders, setOrders] = useState([]);
    const [balance, setBalance] = useState(0);

    const [pageLoading, setPageLoading] = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);

    const [currentPrice, setCurrentPrice] = useState(0);

    const [tradeForm, setTradeForm] = useState({
        "product_id": 1,
        "side": "BUY",
        "volume": 0.1,
        "stop_loss": null,
        "take_profit": null

    });

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === tradeForm.product_id);
    }, [tradeForm.product_id]);

// -----------------------------------------------------------------------------------------------
    const fetchData = async (firstLoad = false) => {
        try {
            if (firstLoad) setPageLoading(true);

            const token = localStorage.getItem("token");
            /*--------------------dữ liệu các lệnh đang ở trạng thái hoạt động--------*/
            const res = await axios.get("http://localhost:5000/api/orders/opening", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setOrders(res.data.data || []);
            /*------------------------------gọi API tới /balance set vào setBalance--------------------------------------*/
            const resB = await axios.get("http://localhost:5000/api/orders/balance", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
            });

            const accounts = resB.data.data || [];

            if (accounts.length > 0) {
                    setBalance(accounts[0].equity);
                }
            }
        catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        } finally {
            if (firstLoad) setPageLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true);

        const interval = setInterval(() => {
            fetchData(false);
        }, 10000);

        return () => clearInterval(interval);
    }, []);
    
/*-------------------------------close orders------------------------------------------------------ */
    const [closingId, setClosingId] = useState(null);

    // ================= FETCH =================
    const fetchOrders = async (firstLoad = false) => {
        try {
            if (firstLoad) setPageLoading(true);

            const token = localStorage.getItem("token");

            const res = await axios.get(
                "http://localhost:5000/api/orders/opening",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setOrders(res.data.data || []);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        } finally {
            if (firstLoad) setPageLoading(false);
        }
    };

    // ================= CLOSE =================
    const handleClose = async (orderId, price) => {
        try {
            if (closingId === orderId) return;

            setClosingId(orderId);

            const token = localStorage.getItem("token");

            await axios.post(
                `http://localhost:5000/api/orders/${orderId}/close`,
                {
                    close_price: price
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            fetchOrders();
        } catch (err) {
            console.error(err);
        } finally {
            setClosingId(null);
        }
    };

    // ================= AUTO REFRESH =================
    useEffect(() => {
        fetchOrders(true);

        const interval = setInterval(() => {
            fetchOrders(false);
        }, 10000);

        return () => clearInterval(interval);
    }, []);
/*------------------------------------------------------------------------------------------------ */
    // =========================
    // HANDLE INPUT
    // =========================
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTradeForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // =========================
    // PLACE ORDER
    // =========================
    const handlePlaceOrder = async (side) => {
        try {
            setOrderLoading(true);

            const token = localStorage.getItem("token");

            const payload = {
                product_id: Number(tradeForm.product_id),
                side: side,
                volume: Number(tradeForm.volume),
                stop_loss:
                    tradeForm.stop_loss === ""
                        ? null
                        : Number(tradeForm.stop_loss),
                take_profit:
                    tradeForm.take_profit === ""
                        ? null
                        : Number(tradeForm.take_profit)
            };

            const res = await axios.post(
                "http://localhost:5000/api/orders/create",
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert(`Đặt lệnh ${side} thành công!`);

            await fetchData(false);
        } catch (error) {
            console.log(error.response?.data);
            const msg =
                error.response?.data?.message ||
                JSON.stringify(error.response?.data?.errors) ||
                "Có lỗi xảy ra";

            alert("Lỗi đặt lệnh: " + msg);

        } finally {
            setOrderLoading(false);
        }
    };

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         axios.post("http://localhost:5000/api/orders/1/autoClose");
    //         current_price: currentPrice
    //     }, 3000);

    //     return () => clearInterval(interval); // cleanup
    // }, [currentPrice]);
    // =========================
    // RENDER
    // =========================
    return (
        <div className="marketPage-container">
            <header>
                <div className="logo">Nova</div>
                <div className="symbol">{selectedProduct?.symbol}</div>
                <div className="balance">
                    {Number(balance).toLocaleString()} USD
                </div>
                <button
                    className="deposit"
                    onClick={() => navigate("/PaymentPage")}
                >
                    Deposit
                </button>
            </header>

            <main className="market-container">
                <nav className="sidebar">
                    <ul>
                        {products.map((product) => (
                            <li
                                key={product.id}
                                className={
                                    tradeForm.product_id === product.id
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setTradeForm(prev => ({
                                        ...prev,
                                        product_id: product.id
                                    }))
                                }
                            >
                                {product.symbol}
                            </li>
                        ))}
                    </ul>
                </nav>

                <section className="chart">
                    <div className="chart-placeholder">
                        {/* <PriceChart symbol={selectedProduct?.symbol} /> */}
                        <PriceChart 
                            symbol={selectedProduct?.symbol}
                            orders={orders}
                            onPriceChange={setCurrentPrice}
                        />
                    </div>
                </section>

                <aside className="trade">
                    <h3>{selectedProduct?.symbol}</h3>

                    <div className="price">
                        <button
                            className="sell"
                            onClick={() => handlePlaceOrder("SELL")}
                            disabled={orderLoading}
                        >
                            BÁN <br />
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#ededed",
                                    marginTop: "2px",
                                    display: "block"
                                }}
                            >
                                {Number(currentPrice + 0.5).toFixed(2)}
                            </span>
                        </button>

                        <button
                            className="buy"
                            onClick={() => handlePlaceOrder("BUY")}
                            disabled={orderLoading}
                        >
                            MUA <br />
                            <span
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#ededed",
                                    marginTop: "2px",
                                    display: "block"
                                }}
                            >
                                {Number(currentPrice - 0.5).toFixed(2)}
                            </span>
                        </button>
                    </div>

                    <div className="trade-inputs">
                        <label>Volume</label>
                        <input
                            type="number"
                            name="volume"
                            step="0.01"
                            value={tradeForm.volume}
                            onChange={handleInputChange}
                        />

                        <label>Take Profit</label>
                        <input
                            type="number"
                            name="take_profit"
                            value={tradeForm.take_profit || ""}
                            onChange={handleInputChange}
                            placeholder="take profit"
                        />

                        <label>Stop Loss</label>
                        <input
                            type="number"
                            name="stop_loss"
                            value={tradeForm.stop_loss || ""}
                            onChange={handleInputChange}
                            placeholder="stop loss"
                        />
                    </div>
                </aside>
            </main>

            <section className="orders">
                <h3>Các lệnh đang mở</h3>

                {pageLoading ? (
                    <p>Đang tải dữ liệu...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Loại</th>
                                <th>Lot</th>
                                <th>Giá mở</th>
                                <th>TP</th>
                                <th>SL</th>
                                <th>Giờ mở</th>
                                <th>Lãi/Lỗ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((item) => (
                                <tr key={item.order_id || item.id}>
                                    <td>{item.symbol}</td>

                                    <td
                                        className={
                                            item.side === "BUY"
                                                ? "text-buy"
                                                : "text-sell"
                                        }
                                    >
                                        {item.side}
                                    </td>

                                    <td>{Number(item.volume).toFixed(2)}</td>

                                    <td>{Number(item.open_price).toFixed(2)}</td>

                                    <td>
                                        {item.take_profit !== null &&
                                        item.take_profit !== undefined
                                            ? Number(item.take_profit).toFixed(2)
                                            : "-"}
                                    </td>

                                    <td>
                                        {item.stop_loss !== null &&
                                        item.stop_loss !== undefined
                                            ? Number(item.stop_loss).toFixed(2)
                                            : "-"}
                                    </td>

                                    <td>
                                        {new Date(
                                            item.created_at
                                        ).toLocaleTimeString()}
                                    </td>

                                    <td
                                        className={
                                            Number(item.pnl || 0) >= 0
                                                ? "profit"
                                                : "loss"
                                        }
                                    >
                                        {Number(item.pnl || 0) >= 0
                                            ? `+${Number(item.pnl).toFixed(2)}`
                                            : Number(item.pnl).toFixed(2)}
                                    </td>

                                    <td>
                                        <button 
                                            onClick={() => handleClose(item.order_id, currentPrice)}
                                            disabled={closingId === item.order_id}
                                        >{closingId === item.order_id ? "..." : "✕"}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}