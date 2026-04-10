export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateAmount = (amount) => {
  const num = parseFloat(amount)
  return !isNaN(num) && num > 0 && num <= 999999.99
}

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== ''
}

export const validateMaxLength = (value, maxLength) => {
  return !value || value.length <= maxLength
}

export const validateMinLength = (value, minLength) => {
  return !value || value.length >= minLength
}

export const validateExpense = (expense) => {
  const errors = {}

  if (!validateRequired(expense.description)) {
    errors.description = 'Description is required'
  } else if (!validateMaxLength(expense.description, 200)) {
    errors.description = 'Description must be less than 200 characters'
  }

  if (!validateRequired(expense.amount)) {
    errors.amount = 'Amount is required'
  } else if (!validateAmount(expense.amount)) {
    errors.amount = 'Please enter a valid amount'
  }

  if (!validateRequired(expense.category)) {
    errors.category = 'Category is required'
  }

  if (!validateRequired(expense.groupId)) {
    errors.groupId = 'Group is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
