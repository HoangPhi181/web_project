// backend/utils/calculations.js

const MARGIN_CALL_LEVEL = 100;
const STOP_OUT_LEVEL    = 50;

// Margin = (price × volume) / leverage
function calculateRequiredMargin(currentPrice, volume, leverage = 100) {
    return (parseFloat(currentPrice) * parseFloat(volume)) / leverage;
}

// Floating P&L
function calculatePnL(openPrice, currentPrice, volume, side) {
    const open    = parseFloat(openPrice);
    const current = parseFloat(currentPrice);
    const vol     = parseFloat(volume);
    return side === 'BUY' ? (current - open) * vol : (open - current) * vol;
}

function calculatePnLPercent(openPrice, currentPrice, volume, side) {
    const pnl  = calculatePnL(openPrice, currentPrice, volume, side);
    const base = parseFloat(openPrice) * parseFloat(volume);
    if (base === 0) return 0;
    return (pnl / base) * 100;
}

// Equity = balance + floating PnL 
function calculateEquity(balance, totalFloatingPnL) {
    return parseFloat(balance) + parseFloat(totalFloatingPnL);
}

// Margin Level = (equity / usedMargin) × 100
function calculateMarginLevel(equity, usedMargin) {
    if (usedMargin <= 0) return Infinity;
    return (equity / usedMargin) * 100;
}

// Free Margin = equity - usedMargin
function calculateFreeMargin(equity, usedMargin) {
    return equity - usedMargin;
}

// Tổng hợp số liệu tài khoản
function calculateAccountMetrics(balance, usedMargin, orders, leverage = 100) {
    const ordersWithPnL = orders.map(o => ({
        ...o,
        floating_pnl: calculatePnL(o.open_price, o.current_price, o.volume, o.side),
        margin:       calculateRequiredMargin(o.open_price, o.volume, leverage),
    }));
    const totalFloatingPnL = ordersWithPnL.reduce((s, o) => s + o.floating_pnl, 0);
    const equity      = calculateEquity(balance, totalFloatingPnL);
    const marginLevel = calculateMarginLevel(equity, usedMargin);
    const freeMargin  = calculateFreeMargin(equity, usedMargin);
    return {
        balance:            parseFloat(balance),
        used_margin:        parseFloat(usedMargin),
        floating_pnl:       totalFloatingPnL,
        equity,
        free_margin:        freeMargin,
        margin_level:       marginLevel,
        is_margin_warning:  marginLevel < MARGIN_CALL_LEVEL && marginLevel !== Infinity,
        is_stop_out:        marginLevel < STOP_OUT_LEVEL    && marginLevel !== Infinity,
        orders:             ordersWithPnL,
    };
}

// Kiểm tra SL/TP có bị kích hoạt chưa 
function isStopLossTriggered(side, currentPrice, stopLoss) {
    if (stopLoss == null) return false;
    const sl  = parseFloat(stopLoss);
    const cur = parseFloat(currentPrice);
    return side === 'BUY' ? cur <= sl : cur >= sl;
}

function isTakeProfitTriggered(side, currentPrice, takeProfit) {
    if (takeProfit == null) return false;
    const tp  = parseFloat(takeProfit);
    const cur = parseFloat(currentPrice);
    return side === 'BUY' ? cur >= tp : cur <= tp;
}

function validatePriceDeviation(openPrice, closePrice, tolerancePercent = 10) {
    const deviation = Math.abs(
        (parseFloat(closePrice) - parseFloat(openPrice)) / parseFloat(openPrice)
    ) * 100;
    return {
        isValid:          deviation <= tolerancePercent,
        deviation:        deviation.toFixed(2),
        allowedDeviation: tolerancePercent,
    };
}

function formatDecimal(value, places = 8) {
    return parseFloat(value).toFixed(places);
}

module.exports = {
    calculateRequiredMargin,
    calculatePnL,
    calculatePnLPercent,
    calculateEquity,
    calculateMarginLevel,
    calculateFreeMargin,
    calculateAccountMetrics,
    isStopLossTriggered,
    isTakeProfitTriggered,
    validatePriceDeviation,
    formatDecimal,
    MARGIN_CALL_LEVEL,
    STOP_OUT_LEVEL,
};
