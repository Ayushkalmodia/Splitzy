import Decimal from 'decimal.js'

// Configure Decimal for currency calculations
Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

/**
 * Backend currency utility functions with decimal-safe calculations
 */

/**
 * Validates if a value is a valid currency amount
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid currency amount
 */
export const isValidCurrency = (value) => {
  try {
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num) && num >= 0
  } catch (error) {
    return false
  }
}

/**
 * Safely rounds a number to 2 decimal places using Decimal.js
 * @param {number|string|Decimal} num - The number to round
 * @returns {number} The rounded number as a float
 */
export const roundToTwo = (num) => {
  try {
    const decimal = new Decimal(num || 0)
    return decimal.toDecimalPlaces(2).toNumber()
  } catch (error) {
    console.warn('Invalid number for rounding:', num)
    return 0
  }
}

/**
 * Safely adds two currency amounts
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @returns {number} The sum as a float
 */
export const addCurrency = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0)
    const decimalB = new Decimal(b || 0)
    return decimalA.plus(decimalB).toDecimalPlaces(2).toNumber()
  } catch (error) {
    console.warn('Invalid addition:', a, b)
    return 0
  }
}

/**
 * Safely subtracts two currency amounts
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount to subtract
 * @returns {number} The difference as a float
 */
export const subtractCurrency = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0)
    const decimalB = new Decimal(b || 0)
    return decimalA.minus(decimalB).toDecimalPlaces(2).toNumber()
  } catch (error) {
    console.warn('Invalid subtraction:', a, b)
    return 0
  }
}

/**
 * Safely multiplies currency amounts
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @returns {number} The product as a float
 */
export const multiplyCurrency = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0)
    const decimalB = new Decimal(b || 0)
    return decimalA.times(decimalB).toDecimalPlaces(2).toNumber()
  } catch (error) {
    console.warn('Invalid multiplication:', a, b)
    return 0
  }
}

/**
 * Safely divides currency amounts
 * @param {number|string|Decimal} a - First amount (numerator)
 * @param {number|string|Decimal} b - Second amount (denominator)
 * @returns {number} The quotient as a float
 */
export const divideCurrency = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0)
    const decimalB = new Decimal(b || 1)
    if (decimalB.isZero()) {
      console.warn('Division by zero attempted')
      return 0
    }
    return decimalA.dividedBy(decimalB).toDecimalPlaces(2).toNumber()
  } catch (error) {
    console.warn('Invalid division:', a, b)
    return 0
  }
}

/**
 * Checks if two currency amounts are equal within 2 decimal places
 * @param {number|string|Decimal} a - First amount
 * @param {number|string|Decimal} b - Second amount
 * @returns {boolean} True if amounts are equal
 */
export const currencyEquals = (a, b) => {
  try {
    const decimalA = new Decimal(a || 0).toDecimalPlaces(2)
    const decimalB = new Decimal(b || 0).toDecimalPlaces(2)
    return decimalA.equals(decimalB)
  } catch (error) {
    console.warn('Invalid comparison:', a, b)
    return false
  }
}

/**
 * Checks if amount is effectively zero (within 2 decimal places)
 * @param {number|string|Decimal} amount - The amount to check
 * @returns {boolean} True if amount is effectively zero
 */
export const isZeroAmount = (amount) => {
  try {
    const decimal = new Decimal(amount || 0).toDecimalPlaces(2)
    return decimal.isZero()
  } catch (error) {
    console.warn('Invalid zero check:', amount)
    return true
  }
}

/**
 * Checks if amount is significant (greater than 0.01)
 * @param {number|string|Decimal} amount - The amount to check
 * @returns {boolean} True if amount is significant
 */
export const isSignificantAmount = (amount) => {
  try {
    const decimal = new Decimal(amount || 0)
    return decimal.greaterThan('0.01')
  } catch (error) {
    console.warn('Invalid significance check:', amount)
    return false
  }
}
