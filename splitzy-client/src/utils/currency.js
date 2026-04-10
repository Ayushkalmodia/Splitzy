import Decimal from 'decimal.js'

// Configure Decimal for currency calculations
Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

/**
 * Currency utility functions with decimal-safe calculations
 */

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
 * Parses a currency string and returns a clean number
 * Handles common currency formats and removes non-numeric characters
 * @param {string} value - The currency string to parse
 * @returns {number} The parsed number
 */
export const parseCurrency = (value) => {
  if (!value || value === '') return 0
  
  // Remove common currency symbols and formatting
  const cleanValue = value
    .replace(/[$,£,¥,]/g, '') // Remove currency symbols
    .replace(/,/g, '') // Remove commas
    .trim()
  
  try {
    const parsed = new Decimal(cleanValue)
    return parsed.toNumber()
  } catch (error) {
    console.warn('Invalid currency format:', value)
    return 0
  }
}

/**
 * Formats a number as currency with proper rounding
 * @param {number|string|Decimal} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  try {
    const decimal = new Decimal(amount || 0)
    const rounded = decimal.toDecimalPlaces(2)
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rounded.toNumber())
  } catch (error) {
    console.warn('Invalid amount for formatting:', amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(0)
  }
}

/**
 * Validates if a string is a valid currency amount
 * @param {string} value - The value to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidCurrency = (value) => {
  if (!value || value === '') return false
  
  const cleanValue = value
    .replace(/[$,£,¥,]/g, '')
    .replace(/,/g, '')
    .trim()
  
  try {
    const parsed = new Decimal(cleanValue)
    return parsed.greaterThanOrEqualTo(0)
  } catch (error) {
    return false
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
