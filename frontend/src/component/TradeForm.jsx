/*--------------TradeForm – panel đặt lệnh BUY / SELL, nhập volume / TP / SL----------*/
export default function TradeForm({
    symbol,
    currentPrice,
    tradeForm,
    orderLoading,
    onInputChange,
    onPlaceOrder,
}) {
    return (
        <aside className="trade">
            <h3>{symbol}</h3>

            <div className="price">
                <button
                    className="sell"
                    onClick={() => onPlaceOrder("SELL")}
                    disabled={orderLoading}
                >
                    BÁN <br />
                    <span
                        style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#ededed",
                            marginTop: "2px",
                            display: "block",
                        }}
                    >
                        {Number(currentPrice + 0.5).toFixed(2)}
                    </span>
                </button>

                <button
                    className="buy"
                    onClick={() => onPlaceOrder("BUY")}
                    disabled={orderLoading}
                >
                    MUA <br />
                    <span
                        style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#ededed",
                            marginTop: "2px",
                            display: "block",
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
                    onChange={onInputChange}
                />

                <label>Take Profit</label>
                <input
                    type="number"
                    name="take_profit"
                    value={tradeForm.take_profit || ""}
                    onChange={onInputChange}
                    placeholder="take profit"
                />

                <label>Stop Loss</label>
                <input
                    type="number"
                    name="stop_loss"
                    value={tradeForm.stop_loss || ""}
                    onChange={onInputChange}
                    placeholder="stop loss"
                />
            </div>
        </aside>
    );
}
