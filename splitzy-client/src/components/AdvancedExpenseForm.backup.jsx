import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Users, Calculator, Percent, Hash } from 'lucide-react'
import { expenseService } from '../services/expenseService'
import { roundToTwo, parseCurrency } from '../utils/currency'
import { validateExpense } from '../utils/validation'
import { useDebounce } from '../hooks/useDebounce'
import Button from './ui/Button.jsx'
import Input from './ui/Input.jsx'
import toast from 'react-hot-toast'

const AdvancedExpenseForm = ({ 
  isOpen, 
  onClose, 
  groupId, 
  groupMembers = [], 
  onExpenseCreated,
  editingExpense = null 
}) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    paidBy: '',
    splitType: 'equal',
    notes: '',
    tags: [],
    currency: 'USD'
  })
  
  const [splits, setSplits] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description || '',
        amount: editingExpense.amount || '',
        category: editingExpense.category || 'other',
        date: editingExpense.date ? new Date(editingExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paidBy: editingExpense.paidBy?._id || editingExpense.paidBy || '',
        splitType: editingExpense.splitType || 'equal',
        notes: editingExpense.notes || '',
        tags: editingExpense.tags || [],
        currency: editingExpense.currency || 'USD'
      })
      
      if (editingExpense.splits && editingExpense.splits.length > 0) {
        setSplits(editingExpense.splits.map(split => ({
          id: Math.random().toString(36).substr(2, 9),
          userId: split.userId?._id || split.userId || null,
          email: split.email || '',
          tempName: split.tempName || '',
          amount: split.amount || 0,
          percentage: split.percentage || 0,
          shares: split.shares || 0,
          name: split.userId?.name || split.tempName || split.email || 'Unknown'
        })))
      }
    } else {
      // Initialize with current user for equal splits
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      setFormData(prev => ({ ...prev, paidBy: String(currentUser.id || currentUser._id || '') }))
    }
  }, [editingExpense?._id])
  
  // Initialize splits when groupMembers change
  useEffect(() => {
    if (!editingExpense && groupMembers?.length > 0) {
      initializeEqualSplits(groupMembers, parseFloat(formData.amount) || 0)
    }
  }, [groupMembers, formData.amount, editingExpense])

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any pending operations
      setSplits([])
      setErrors({})
    }
  }, [])

  const initializeEqualSplits = (members, amount = 0) => {
    const equalAmount = members.length > 0 ? amount / members.length : 0
    const equalPercentage = members.length > 0 ? 100 / members.length : 0
    
    const initialSplits = members.map(member => ({
      id: Math.random().toString(36).substr(2, 9),
      userId: member.userId?._id || member.userId || null,
      email: member.email || null,
      tempName: member.tempName || member.userId?.name || member.email?.split('@')[0] || 'Unknown',
      amount: equalAmount,
      percentage: equalPercentage,
      shares: 1,
      name: member.userId?.name || member.tempName || member.email || 'Unknown'
    }))
    setSplits(initialSplits)
  }

  const debouncedAmount = useDebounce(formData.amount, 300)

  // Recalculate splits when amount changes for equal/percentage/shares types
  useEffect(() => {
    if (debouncedAmount && splits.length > 0) {
      recalculateSplits(formData.splitType)
    }
  }, [debouncedAmount, formData.splitType, splits.length])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Special handling for amount field
    if (name === 'amount') {
      const cleanAmount = parseCurrency(value)
      setFormData(prev => ({ ...prev, [name]: cleanAmount.toString() }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const recalculateSplits = (splitType) => {
    const amount = parseFloat(formData.amount) || 0
    
    // Prevent NaN and invalid calculations
    if (isNaN(amount) || amount < 0) {
      return
    }
    
    const updatedSplits = [...splits]
    
    switch (splitType) {
      case 'equal':
        const equalAmount = amount / updatedSplits.length
        const equalPercentage = 100 / updatedSplits.length
        updatedSplits.forEach(split => {
          split.amount = roundToTwo(equalAmount)
          split.percentage = roundToTwo(equalPercentage)
          split.shares = 1
        })
        break
        
      case 'unequal':
        // Keep current amounts, recalculate percentages
        const totalAmount = updatedSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0)
        updatedSplits.forEach(split => {
          split.percentage = totalAmount > 0 ? roundToTwo((Number(split.amount) / totalAmount) * 100) : 0
          split.shares = 0
        })
        break
        
      case 'percentage':
        // Keep current percentages, recalculate amounts
        const totalPercentage = updatedSplits.reduce((sum, split) => sum + (Number(split.percentage) || 0), 0)
        if (Math.abs(totalPercentage - 100) > 0.01) {
          // Auto-adjust to 100%
          const factor = 100 / totalPercentage
          updatedSplits.forEach(split => {
            split.percentage = roundToTwo((Number(split.percentage) || 0) * factor)
            split.amount = roundToTwo((split.percentage / 100) * amount)
            split.shares = 0
          })
        } else {
          updatedSplits.forEach(split => {
            split.amount = roundToTwo((Number(split.percentage) / 100) * amount)
            split.shares = 0
          })
        }
        break
        
      case 'shares':
        // Keep current shares, recalculate amounts and percentages
        const totalShares = updatedSplits.reduce((sum, split) => sum + (Number(split.shares) || 0), 0)
        updatedSplits.forEach(split => {
          split.amount = totalShares > 0 ? roundToTwo((Number(split.shares) / totalShares) * amount) : 0
          split.percentage = totalShares > 0 ? roundToTwo((Number(split.shares) / totalShares) * 100) : 0
        })
        break
        
      case 'manual':
        // Keep current manual amounts
        const manualTotal = updatedSplits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0)
        updatedSplits.forEach(split => {
          split.percentage = manualTotal > 0 ? roundToTwo((Number(split.amount) / manualTotal) * 100) : 0
          split.shares = 0
        })
        break
    }
    
    setSplits(updatedSplits)
  }

  const handleSplitTypeChange = (newSplitType) => {
    setFormData(prev => ({ ...prev, splitType: newSplitType }))
    
    // Recalculate splits based on new type
    if (splits.length > 0) {
      recalculateSplits(newSplitType)
    }
  }

  const handleSplitChange = (splitId, field, value) => {
    const numValue = field === 'amount' || field === 'percentage' || field === 'shares' 
      ? parseFloat(value) || 0 
      : value
    
    const updatedSplits = splits.map(split => {
      if (split.id === splitId) {
        const updatedSplit = { ...split, [field]: numValue }
        
        // Auto-calculate based on split type
        if (formData.splitType === 'percentage' && field === 'percentage') {
          const amount = parseFloat(formData.amount) || 0
          updatedSplit.amount = roundToTwo((numValue / 100) * amount)
        } else if (formData.splitType === 'shares' && field === 'shares') {
          const amount = parseFloat(formData.amount) || 0
          const totalShares = splits.reduce((sum, s) => s.id === splitId ? sum + numValue : sum + (Number(s.shares) || 0), 0)
          updatedSplit.amount = totalShares > 0 ? roundToTwo((numValue / totalShares) * amount) : 0
          updatedSplit.percentage = totalShares > 0 ? roundToTwo((numValue / totalShares) * 100) : 0
        } else if ((formData.splitType === 'unequal' || formData.splitType === 'manual') && field === 'amount') {
          const totalAmount = splits.reduce((sum, s) => s.id === splitId ? sum + numValue : sum + (Number(s.amount) || 0), 0)
          updatedSplit.percentage = totalAmount > 0 ? roundToTwo((numValue / totalAmount) * 100) : 0
        }
        
        return updatedSplit
      }
      return split
    })
    
    setSplits(updatedSplits)
  }

  const addSplit = () => {
    const newSplit = {
      id: Math.random().toString(36).substr(2, 9),
      userId: null,
      email: '',
      tempName: '',
      amount: 0,
      percentage: 0,
      shares: 1,
      name: 'New Person'
    }
    
    setSplits(prev => [...prev, newSplit])
    recalculateSplits(formData.splitType)
  }

  const removeSplit = (splitId) => {
    if (splits.length <= 1) {
      toast.error('At least one split is required')
      return
    }
    
    const updatedSplits = splits.filter(split => split.id !== splitId)
    setSplits(updatedSplits)
    recalculateSplits(formData.splitType)
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    
    if (!formData.paidBy) {
      newErrors.paidBy = 'Paid by is required'
    } else {
      // Check if selected paidBy is a valid member
      const isValidMember = groupMembers?.some(member => {
        const userId = member.userId?._id || member.userId
        const memberId = member._id || member.email
        return String(userId) === formData.paidBy || memberId === formData.paidBy
      })
      
      if (!isValidMember) {
        newErrors.paidBy = 'Please select a valid member'
      }
    }
    
    if (splits.length === 0) {
      newErrors.splits = 'At least one split is required'
    } else {
      const totalSplits = splits.reduce((sum, split) => sum + (split.amount || 0), 0)
      const expenseAmount = parseFloat(formData.amount) || 0
      
      if (Math.abs(totalSplits - expenseAmount) > 0.01) {
        newErrors.splits = `Total splits ($${totalSplits.toFixed(2)}) must equal expense amount ($${expenseAmount.toFixed(2)})`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Find selected member to determine paidBy structure
      const selectedMember = groupMembers?.find(member => {
        const userId = member.userId?._id || member.userId
        const memberId = member._id || member.email
        return String(userId) === formData.paidBy || memberId === formData.paidBy
      })
      
      // For paidBy, always use a valid ObjectId or current user fallback
      let paidByValue = selectedMember?.userId?._id || selectedMember?.userId
      if (!paidByValue) {
        // Fallback to current user for temp members
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        paidByValue = currentUser.id || currentUser._id
      }
      
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        groupId,
        paidBy: paidByValue,
        splits: splits.map(split => {
          const splitData = {
            tempName: split.tempName || split.name || '',
            amount: parseFloat(split.amount) || 0,
            percentage: parseFloat(split.percentage) || 0,
            shares: parseFloat(split.shares) || 0
          }
          // Only include userId if it has a value
          if (split.userId) {
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense._id, {
          ...formData,
          amount: expenseAmount,
          splits
        })
        toast.success('Expense updated successfully')
      } else {
        await expenseService.createExpense({
          ...formData,
          amount: expenseAmount,
          splits
        })
        toast.success('Expense added successfully')
      }
      
      onExpenseCreated && onExpenseCreated()
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error(error.message || 'Failed to save expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'other',
      date: new Date().toISOString().split('T')[0],
      paidBy: '',
      splitType: 'equal',
      notes: '',
      tags: [],
      currency: 'USD'
    })
    setSplits([])
    setErrors({})
  }

  const getSplitTypeIcon = (type) => {
    switch (type) {
      case 'equal': return <Users className="w-4 h-4" />
      case 'percentage': return <Percent className="w-4 h-4" />
      case 'shares': return <Hash className="w-4 h-4" />
      default: return <Calculator className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Dinner at restaurant"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="food">Food & Dining</option>
                <option value="transport">Transportation</option>
                <option value="accommodation">Accommodation</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="utilities">Utilities</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid By *
              </label>
              <select
                name="paidBy"
                value={formData.paidBy}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.paidBy ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select who paid</option>
                {groupMembers?.map(member => {
                  const userId = member.userId?._id || member.userId
                  const memberId = member._id || member.email || Math.random().toString(36)
                  const name = member.userId?.name || member.tempName || member.email || 'Unknown'
                  const hasUserId = !!userId
                  
                  return (
                    <option key={memberId} value={hasUserId ? String(userId) : memberId}>
                      {name} {!hasUserId ? '(temp)' : ''}
                    </option>
                  )
                })}
              </select>
              {errors.paidBy && (
                <p className="text-red-500 text-sm mt-1">{errors.paidBy}</p>
              )}
            </div>
          </div>

          {/* Split Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['equal', 'unequal', 'percentage', 'shares', 'manual'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    formData.splitType === type
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {getSplitTypeIcon(type)}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Splits Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Split Between *
              </label>
              <button
                type="button"
                onClick={addSplit}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Person
              </button>
            </div>

            {errors.splits && (
              <p className="text-red-500 text-sm mb-3">{errors.splits}</p>
            )}

            <div className="space-y-2">
              {splits.map((split) => (
                <div key={split.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={split.name}
                      onChange={(e) => handleSplitChange(split.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Name"
                    />
                  </div>

                  {formData.splitType === 'percentage' && (
                    <div className="w-24">
                      <input
                        type="number"
                        value={split.percentage}
                        onChange={(e) => handleSplitChange(split.id, 'percentage', parseFloat(e.target.value) || 0)}
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="%"
                      />
                    </div>
                  )}

                  {formData.splitType === 'shares' && (
                    <div className="w-24">
                      <input
                        type="number"
                        value={split.shares}
                        onChange={(e) => handleSplitChange(split.id, 'shares', parseFloat(e.target.value) || 0)}
                        step="0.1"
                        min="0"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Shares"
                      />
                    </div>
                  )}

                  {(formData.splitType === 'unequal' || formData.splitType === 'manual') && (
                    <div className="w-32">
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) => handleSplitChange(split.id, 'amount', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Amount"
                      />
                    </div>
                  )}

                  <div className="w-32 text-right font-medium">
                    ${split.amount.toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSplit(split.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {splits.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Splits:</span>
                  <span className="font-bold text-lg">
                    ${splits.reduce((sum, split) => sum + (split.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Create Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdvancedExpenseForm
