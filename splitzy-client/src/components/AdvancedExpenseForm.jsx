import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import { expenseService } from '../services/expenseService'
import { groupService } from '../services/groupService'
import { authService } from '../services/authService'
import { analyticsService } from '../services/analyticsService'
import { slugFromMlLabel } from '../constants/expenseCategories'
import useFormValidation from '../hooks/useFormValidation.js'
import Button from './ui/Button.jsx'
import Input from './ui/Input.jsx'
import ExpenseDetails from './expense/ExpenseDetails.jsx'
import SplitTypeSelector from './expense/SplitTypeSelector.jsx'
import SplitConfiguration from './expense/SplitConfiguration.jsx'
import toast from 'react-hot-toast'

const AdvancedExpenseForm = ({ 
  isOpen, 
  onClose, 
  groupId, 
  onExpenseCreated,
  editingExpense = null 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groups, setGroups] = useState([])
  const [currentGroupMembers, setCurrentGroupMembers] = useState([])
  const [splits, setSplits] = useState([])
  /** Latest ML suggestion from Node → FastAPI (for badge + accept). */
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [categorizeError, setCategorizeError] = useState(null)
  
  const currentUser = authService.getCurrentUser()
  const initialFormValues = useMemo(() => ({
    description: '',
    amount: '',
    merchant: '',
    category: 'other',
    categoryManuallySelected: false,
    groupId: groupId || '',
    splitType: 'equal',
    paidBy: '',
    notes: '',
    tags: [],
    splitBetween: []
  }), [groupId])

  // Initialize form validation
  const {
    values: formData,
    errors,
    isValid,
    setValue,
    setValuesBulk,
    setError,
    clearErrors,
    validateForm,
    resetForm
  } = useFormValidation(initialFormValues)

  // Fetch groups on mount
  useEffect(() => {
    if (isOpen) {
      fetchGroups()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setAiSuggestion(null)
      setCategorizeError(null)
      setIsCategorizing(false)
    }
  }, [isOpen])

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const data = await groupService.getGroups()
      const groupsArray = data?.items || data || []
      setGroups(Array.isArray(groupsArray) ? groupsArray : [])
    } catch (error) {
      toast.error('Failed to fetch groups')
      console.error('Error fetching groups:', error)
    }
  }

  // Update group members when group changes
  useEffect(() => {
    if (formData.groupId) {
      const group = groups.find(g => g._id === formData.groupId)
      if (group) {
        const members = (group.members || []).map(member => ({
          id: member._id,
          userId: member._id,
          email: member.email,
          name: member.name || member.email,
          isTemporary: false
        }))
        setCurrentGroupMembers(members)
      }
    } else {
      setCurrentGroupMembers([])
    }
  }, [formData.groupId, groups])

  /**
   * Debounced ML categorization: description (+ optional merchant, amount) → Node → FastAPI.
   * Does not override category while the user has explicitly chosen manual mode.
   */
  useEffect(() => {
    if (!isOpen) return undefined

    const desc = String(formData.description || '').trim()
    if (desc.length < 3) {
      setAiSuggestion(null)
      setCategorizeError(null)
      setIsCategorizing(false)
      return undefined
    }

    const timer = setTimeout(async () => {
      setIsCategorizing(true)
      setCategorizeError(null)
      try {
        const amt = formData.amount !== '' && formData.amount != null ? parseFloat(formData.amount) : NaN
        const data = await analyticsService.categorizeExpense({
          description: desc,
          merchant: formData.merchant || '',
          amount: Number.isFinite(amt) ? amt : undefined
        })
        const slug = slugFromMlLabel(data.predictedCategory)
        const rawConf = data.categoryConfidence
        const confidence = typeof rawConf === 'number' ? rawConf : Number(rawConf)
        setAiSuggestion({
          slug,
          labelDisplay: data.predictedCategory,
          confidence: Number.isFinite(confidence) ? confidence : 0
        })
        if (!formData.categoryManuallySelected) {
          setValue('category', slug)
        }
      } catch (err) {
        setAiSuggestion(null)
        setCategorizeError(
          err.response?.data?.message || err.message || 'Category suggestion unavailable'
        )
      } finally {
        setIsCategorizing(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [
    isOpen,
    formData.description,
    formData.merchant,
    formData.amount,
    formData.categoryManuallySelected,
    setValue
  ])

  const handleAcceptAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return
    setValue('categoryManuallySelected', false)
    setValue('category', aiSuggestion.slug)
  }, [aiSuggestion, setValue])

  const handleCategoryUserPick = useCallback(() => {
    setValue('categoryManuallySelected', true)
  }, [setValue])

  // Initialize form when editing
  useEffect(() => {
    if (editingExpense) {
      const editData = {
        description: editingExpense.description || '',
        amount: editingExpense.amount?.toString() || '',
        merchant: editingExpense.merchant || '',
        category: editingExpense.category || 'other',
        categoryManuallySelected: true,
        groupId: editingExpense.groupId?._id || editingExpense.groupId || initialFormValues.groupId || '',
        splitType: editingExpense.splitType || 'equal',
        paidBy: editingExpense.paidBy?._id || editingExpense.paidBy || '',
        notes: editingExpense.notes || '',
        tags: editingExpense.tags || [],
        splitBetween: editingExpense.splitBetween || []
      }
      setValuesBulk(editData)
      
      if (editingExpense.splits) {
        const initializedSplits = editingExpense.splits.map(split => ({
          id: Math.random().toString(36).substr(2, 9),
          userId: split.userId || null,
          email: split.email || null,
          name: split.name || split.email || '',
          amount: split.amount || 0,
          percentage: split.percentage || 0,
          shares: split.shares || 0,
          isTemporary: !split.userId
        }))
        setSplits(initializedSplits)
      }
    } else {
      resetForm(initialFormValues)
      setSplits([])
      setAiSuggestion(null)
      setCategorizeError(null)
    }
  }, [editingExpense, initialFormValues, setValuesBulk, resetForm])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    clearErrors()

    try {
      const numericAmount = parseFloat(formData.amount)
      const currentUserId = currentUser?.id || currentUser?._id || null
      const currentUserEmail = currentUser?.email || null

      // Backend split validation requires at least one split.
      // For personal expenses, default to a single self split.
      const normalizedSplits = splits.length > 0
        ? splits
        : [{
            userId: currentUserId,
            amount: numericAmount,
            percentage: 100,
            shares: 1
          }]

      const payload = {
        ...formData,
        amount: numericAmount,
        categoryManuallySelected: Boolean(formData.categoryManuallySelected),
        splits: normalizedSplits.map((split) => {
          const mapped = {
            userId: split.userId,
            amount: split.amount,
            percentage: split.percentage,
            shares: split.shares
          }

          if (!mapped.userId && currentUserId) {
            mapped.userId = currentUserId
          }

          return mapped
        })
      }

      const payer = formData.paidBy || currentUserId || currentUserEmail
      if (payer) {
        payload.paidBy = payer
      }

      let response
      if (editingExpense) {
        response = await expenseService.updateExpense(editingExpense._id, payload)
        toast.success('Expense updated successfully')
      } else {
        response = await expenseService.createExpense(payload)
        toast.success('Expense created successfully')
      }

      onExpenseCreated?.(response)
      onClose()
      resetForm()
      setSplits([])
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save expense'
      toast.error(errorMessage)
      
      // Set field-specific errors if provided
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          setError(err.field, err.message)
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      resetForm()
      setSplits([])
      setAiSuggestion(null)
      setCategorizeError(null)
      clearErrors()
    }
  }

  // Handle split type change
  const handleSplitTypeChange = useCallback((splitType) => {
    setValue('splitType', splitType)
    setSplits([])
  }, [setValue])

  // Handle splits change
  const handleSplitsChange = useCallback((newSplits) => {
    setSplits(newSplits)
    setValue('splits', newSplits)
  }, [setValue])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Expense Details */}
          <ExpenseDetails
            formData={formData}
            onFormDataChange={setValue}
            groups={groups}
            members={currentGroupMembers}
            errors={errors}
            aiSuggestion={aiSuggestion}
            isCategorizing={isCategorizing}
            categorizeError={categorizeError}
            onAcceptAiSuggestion={handleAcceptAiSuggestion}
            onCategoryUserChange={handleCategoryUserPick}
          />

          {/* Split Type Selection */}
          {formData.groupId && currentGroupMembers.length > 0 && (
            <SplitTypeSelector
              splitType={formData.splitType}
              onSplitTypeChange={handleSplitTypeChange}
              disabled={isSubmitting}
            />
          )}

          {/* Split Configuration */}
          {formData.groupId && currentGroupMembers.length > 0 && formData.splitType && (
            <SplitConfiguration
              splitType={formData.splitType}
              amount={parseFloat(formData.amount) || 0}
              members={currentGroupMembers}
              splits={splits}
              onSplitsChange={handleSplitsChange}
              errors={errors}
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              loading={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {editingExpense ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {editingExpense ? 'Update Expense' : 'Create Expense'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdvancedExpenseForm
