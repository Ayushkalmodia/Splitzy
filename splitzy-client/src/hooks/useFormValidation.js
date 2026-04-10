import { useState, useCallback } from 'react'
import { isValidCurrency, currencyEquals } from '../utils/currency.js'

const useFormValidation = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validateField = useCallback((name, value, allValues = values) => {
    const fieldErrors = []

    // Common validations
    switch (name) {
      case 'description':
        if (!value || value.trim() === '') {
          fieldErrors.push('Description is required')
        } else if (value.trim().length < 3) {
          fieldErrors.push('Description must be at least 3 characters')
        }
        break

      case 'amount':
        if (!value) {
          fieldErrors.push('Amount is required')
        } else if (!isValidCurrency(value)) {
          fieldErrors.push('Please enter a valid amount')
        } else if (parseFloat(value) <= 0) {
          fieldErrors.push('Amount must be greater than 0')
        }
        break

      case 'category':
        if (!value) {
          fieldErrors.push('Category is required')
        }
        break

      case 'date':
        if (!value) {
          fieldErrors.push('Date is required')
        } else {
          const date = new Date(value)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (date > today) {
            fieldErrors.push('Date cannot be in the future')
          }
        }
        break

      case 'groupId':
        // Group is optional, but if provided, validate related fields
        if (value && allValues.splitType !== 'equal') {
          if (!allValues.paidBy) {
            fieldErrors.push('Please select who paid for this expense')
          }
        }
        break

      case 'paidBy':
        if (allValues.groupId && !value) {
          fieldErrors.push('Please select who paid for this expense')
        }
        break

      case 'splitType':
        if (!value) {
          fieldErrors.push('Split type is required')
        }
        break

      case 'splits':
        if (Array.isArray(value)) {
          // Validate each split
          value.forEach((split, index) => {
            if (!split.name && !split.email) {
              fieldErrors.push(`Person ${index + 1}: Name or email is required`)
            }
            
            if (allValues.splitType === 'percentage') {
              if (!split.percentage || split.percentage <= 0) {
                fieldErrors.push(`Person ${index + 1}: Percentage must be greater than 0`)
              }
            }
            
            if (allValues.splitType === 'shares') {
              if (!split.shares || split.shares <= 0) {
                fieldErrors.push(`Person ${index + 1}: Shares must be greater than 0`)
              }
            }
            
            if (allValues.splitType === 'unequal') {
              if (!split.amount || split.amount <= 0) {
                fieldErrors.push(`Person ${index + 1}: Amount must be greater than 0`)
              }
            }
          })

          // Validate totals
          const totalAmount = value.reduce((sum, split) => sum + (split.amount || 0), 0)
          if (!currencyEquals(totalAmount, parseFloat(allValues.amount))) {
            fieldErrors.push('Split amounts must equal the total expense amount')
          }

          if (allValues.splitType === 'percentage') {
            const totalPercentage = value.reduce((sum, split) => sum + (split.percentage || 0), 0)
            if (!currencyEquals(totalPercentage, 100)) {
              fieldErrors.push('Percentages must total 100%')
            }
          }
        } else {
          fieldErrors.push('At least one split is required')
        }
        break

      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          fieldErrors.push('Please enter a valid email address')
        }
        break

      default:
        break
    }

    return fieldErrors
  }, [values])

  const validateForm = useCallback((allValues = values) => {
    const newErrors = {}
    
    // Validate all known fields
    Object.keys(allValues).forEach(key => {
      const fieldErrors = validateField(key, allValues[key], allValues)
      if (fieldErrors.length > 0) {
        newErrors[key] = fieldErrors[0] // Show first error for each field
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validateField, values])

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [errors])

  const setValuesBulk = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }))
  }, [])

  const setError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const getFieldProps = useCallback((name) => ({
    value: values[name] || '',
    onChange: (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setValue(name, value)
    },
    onBlur: () => setFieldTouched(name, true),
    error: touched[name] ? errors[name] : undefined,
    touched: touched[name]
  }), [values, errors, touched, setValue, setFieldTouched])

  return {
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    setValue,
    setValuesBulk,
    setError,
    clearErrors,
    setTouched: setFieldTouched,
    validateField,
    validateForm,
    resetForm,
    getFieldProps
  }
}

export default useFormValidation
