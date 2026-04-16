// backend/utils/validators.js
// Centralized input validation

const { ValidationError } = require('./errors');

function validateOrderCreate(body) {
  const errors = {};

  // Validate product_id
  if (!body.product_id || !Number.isInteger(body.product_id) || body.product_id <= 0) {
    errors.product_id = 'Invalid product ID';
  }

  // Validate side
  if (!['BUY', 'SELL'].includes(body.side?.toUpperCase())) {
    errors.side = 'Side must be BUY or SELL';
  }

  // Validate volume
  if (!body.volume || isNaN(body.volume)) {
    errors.volume = 'Volume must be a valid number';
  } else {
    const vol = parseFloat(body.volume);
    if (vol <= 0) {
      errors.volume = 'Volume must be greater than 0';
    }
    if (vol > 1000) {
      errors.volume = 'Volume must be <= 1000';
    }
  }

  // Validate stop_loss
  if (!body.stop_loss || isNaN(body.stop_loss)) {
    errors.stop_loss = 'Stop loss must be a valid number';
  } else if (parseFloat(body.stop_loss) <= 0) {
    errors.stop_loss = 'Stop loss must be greater than 0';
  }

  // Validate take_profit
  if (!body.take_profit || isNaN(body.take_profit)) {
    errors.take_profit = 'Take profit must be a valid number';
  } else if (parseFloat(body.take_profit) <= 0) {
    errors.take_profit = 'Take profit must be greater than 0';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    product_id: parseInt(body.product_id),
    side: body.side.toUpperCase(),
    volume: parseFloat(body.volume).toFixed(8),
    stop_loss: parseFloat(body.stop_loss).toFixed(8),
    take_profit: parseFloat(body.take_profit).toFixed(8)
  };
}

function validateCloseOrder(body) {
  const errors = {};

  if (!body.close_price || isNaN(body.close_price)) {
    errors.close_price = 'Close price must be a valid number';
  } else if (parseFloat(body.close_price) <= 0) {
    errors.close_price = 'Close price must be greater than 0';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    close_price: parseFloat(body.close_price).toFixed(8)
  };
}

function validatePagination(query) {
  let limit = parseInt(query.limit) || 20;
  let page = parseInt(query.page) || 1;

  // Limit constraints
  if (limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  // Page constraints
  if (page < 1) page = 1;

  return {
    limit,
    page,
    offset: (page - 1) * limit
  };
}

function validateRegister(body) {
  const errors = {};

  // Validate username
  if (!body.username || typeof body.username !== 'string') {
    errors.username = 'Username is required';
  } else if (body.username.length < 3 || body.username.length > 50) {
    errors.username = 'Username must be between 3 and 50 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(body.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores';
  }

  // Validate email
  if (!body.email || typeof body.email !== 'string') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  if (!body.password || typeof body.password !== 'string') {
    errors.password = 'Password is required';
  } else if (body.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(body.password)) {
    errors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    username: body.username.trim(),
    email: body.email.trim().toLowerCase(),
    password: body.password
  };
}

module.exports = {
  validateOrderCreate,
  validateCloseOrder,
  validatePagination,
  validateRegister
};
