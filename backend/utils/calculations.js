
function calculateRequiredMargin(currentPrice, volume, leverage = 100) {
  return (parseFloat(currentPrice) * parseFloat(volume) ) / leverage;
}

function calculatePnL(openPrice, currentPrice, volume, side) {
  const open = parseFloat(openPrice);
  const current = parseFloat(currentPrice);
  const vol = parseFloat(volume);

  let pnl;
  if (side === 'BUY') {
    pnl = (current - open) * vol;
  } else {
    pnl = (open - current) * vol;
  }

  return pnl;
}

/**
 * Calculate P&L percentage
 */
function calculatePnLPercent(openPrice, currentPrice, volume, side) {
  const pnl = calculatePnL(openPrice, currentPrice, volume, side);
  const baseAmount = parseFloat(openPrice) * parseFloat(volume);

  if (baseAmount === 0) return 0;

  return (pnl / baseAmount) * 100;
}

/**
 * Validate price range (for closing order)
 * Check if close_price doesn't deviate more than 10% from open_price
 */
function validatePriceDeviation(openPrice, closePrice, tolerancePercent = 10) {
  const open = parseFloat(openPrice);
  const close = parseFloat(closePrice);

  const deviation = Math.abs((close - open) / open) * 100;

  return {
    isValid: deviation <= tolerancePercent,
    deviation: deviation.toFixed(2),
    allowedDeviation: tolerancePercent
  };
}

/**
 * Format decimal to 8 places (for crypto)
 */
function formatDecimal(value, places = 8) {
  return parseFloat(value).toFixed(places);
}

module.exports = {
  calculateRequiredMargin,
  calculatePnL,
  calculatePnLPercent,
  validatePriceDeviation,
  formatDecimal
};
