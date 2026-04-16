// backend/utils/errors.js
// Centralized error handling classes

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Constructor for ValidationError
 * @param {string} message - Error message
 * @param {Object} [errors={}] - Object with key-value pairs of field names and error messages
 */
/*******  2e4b8e44-875d-4d10-8269-bbbc3af9b426  *******/  constructor(message, errors = {}) {
    super(message, 400);
    this.errors = errors;
  }
}

class InsufficientBalanceError extends AppError {
  constructor(required, available) {
    super('Insufficient balance', 402);
    this.required_margin = required;
    this.available_balance = available;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  InsufficientBalanceError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
};
