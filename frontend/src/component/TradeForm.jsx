const LEVERAGE = 100;
const fmt = (v, d = 2) => v != null && !isNaN(Number(v))
    ? Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
    : "—";

export default function TradeForm({
    symbol, currentPrice, tradeForm, orderLoading,
    onInputChange, onPlaceOrder, balance, usedMargin,
}) {
    const selectedSide = tradeForm.side || null;

    // Ký quỹ cần thiết
    const requiredMargin = currentPrice && tradeForm.volume
        ? (currentPrice * Number(tradeForm.volume)) / LEVERAGE
        : null;

    // Free margin = balance - used_margin
    const freeMargin = balance != null && usedMargin != null
        ? parseFloat(balance) - parseFloat(usedMargin)
        : null;

    const notEnough = requiredMargin !== null && freeMargin !== null && requiredMargin > freeMargin;

    const handleSelectSide = (side) => {
        onInputChange({ target: { name: "side", value: selectedSide === side ? "" : side } });
    };

    // Validate SL/TP ngay tại frontend trước khi gửi API
    const validateSLTP = () => {
        const sl   = tradeForm.stop_loss;
        const tp   = tradeForm.take_profit;
        const hasSL = sl !== null && sl !== undefined && sl !== '';
        const hasTP = tp !== null && tp !== undefined && tp !== '';
        const errors = [];

        if (!currentPrice) return errors;

        if (hasSL) {
            const v = parseFloat(sl);
            if (isNaN(v) || v <= 0) {
                errors.push('Stop Loss phải là số dương');
            } else if (selectedSide === 'BUY' && v >= currentPrice) {
                errors.push(`Stop Loss lệnh MUA phải nhỏ hơn giá hiện tại (${currentPrice.toFixed(2)})`);
            } else if (selectedSide === 'SELL' && v <= currentPrice) {
                errors.push(`Stop Loss lệnh BÁN phải lớn hơn giá hiện tại (${currentPrice.toFixed(2)})`);
            }
        }

        if (hasTP) {
            const v = parseFloat(tp);
            if (isNaN(v) || v <= 0) {
                errors.push('Take Profit phải là số dương');
            } else if (selectedSide === 'BUY' && v <= currentPrice) {
                errors.push(`Take Profit lệnh MUA phải lớn hơn giá hiện tại (${currentPrice.toFixed(2)})`);
            } else if (selectedSide === 'SELL' && v >= currentPrice) {
                errors.push(`Take Profit lệnh BÁN phải nhỏ hơn giá hiện tại (${currentPrice.toFixed(2)})`);
            }
        }

        if (hasSL && hasTP && parseFloat(sl) === parseFloat(tp))
            errors.push('Stop Loss và Take Profit không được bằng nhau');

        return errors;
    };

    const handlePlace = () => {
        if (!selectedSide) { alert("Vui lòng chọn MUA hoặc BÁN"); return; }
        if (notEnough) {
            alert(`Không đủ số dư.\nCần ký quỹ: $${requiredMargin.toFixed(2)}\nKhả dụng: $${freeMargin.toFixed(2)}`);
            return;
        }

        const slErrs = validateSLTP();
        if (slErrs.length > 0) {
            alert("❌ " + slErrs.join('\n'));
            return;
        }

        onPlaceOrder(selectedSide);
    };

    return (
        <aside className="trade">
            <h3>{symbol}</h3>

            {/* Chọn side */}
            <div className="price">
                <button
                    className={`sell${selectedSide === "SELL" ? " side-active" : ""}`}
                    onClick={() => handleSelectSide("SELL")}
                    disabled={orderLoading} type="button"
                >
                    BÁN
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginTop: 2, display: "block" }}>
                        {currentPrice ? Number(currentPrice + 0.5).toFixed(2) : "..."}
                    </span>
                </button>
                <button
                    className={`buy${selectedSide === "BUY" ? " side-active" : ""}`}
                    onClick={() => handleSelectSide("BUY")}
                    disabled={orderLoading} type="button"
                >
                    MUA
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#ededed", marginTop: 2, display: "block" }}>
                        {currentPrice ? Number(currentPrice - 0.5).toFixed(2) : "..."}
                    </span>
                </button>
            </div>

            <div className="trade-inputs">
                <label>Volume</label>
                <input type="number" name="volume" step="0.01" min="0.01"
                    value={tradeForm.volume} onChange={onInputChange} />

                <label>Take Profit</label>
                <input type="number" name="take_profit"
                    value={tradeForm.take_profit || ""} onChange={onInputChange} placeholder="take profit" />

                <label>Stop Loss</label>
                <input type="number" name="stop_loss"
                    value={tradeForm.stop_loss || ""} onChange={onInputChange} placeholder="stop loss" />

                {/* THÔNG TIN KÝ QUỸ */}
                <div className="margin-info">
                    <div className="margin-title">THÔNG TIN KÝ QUỸ</div>
                    <div className="margin-row">
                        <span>Đòn bẩy</span>
                        <span>1:{LEVERAGE}</span>
                    </div>
                    <div className="margin-row">
                        <span>Ký quỹ cần thiết</span>
                        <span style={{ color: notEnough ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                            {requiredMargin !== null ? `$${requiredMargin.toFixed(2)}` : "—"}
                        </span>
                    </div>
                    <div className="margin-row">
                        <span>Số dư khả dụng</span>
                        <span>{freeMargin !== null ? `$${fmt(freeMargin)}` : "..."}</span>
                    </div>
                </div>
            </div>

            {/* NÚT ĐẶT LỆNH */}
            <button
                className={`place-order-btn${selectedSide ? " " + selectedSide.toLowerCase() : ""}`}
                onClick={handlePlace}
                disabled={orderLoading || !selectedSide} type="button"
            >
                {orderLoading ? "Đang xử lý..."
                    : selectedSide ? `Đặt lệnh ${selectedSide === "BUY" ? "MUA" : "BÁN"}`
                    : "Đặt lệnh"}
            </button>
        </aside>
    );
}
