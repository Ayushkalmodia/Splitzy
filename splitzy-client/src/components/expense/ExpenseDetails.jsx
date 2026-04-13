import React from 'react'
import { DollarSign, Calendar, Tag, FileText, Sparkles, User } from 'lucide-react'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'
import { EXPENSE_CATEGORY_OPTIONS } from '../../constants/expenseCategories.js'

/**
 * Core expense fields: description, amount, optional merchant, category, group, payer, etc.
 * Category row supports AI suggestion (badge + accept) vs manual selection (distinct styling).
 */
const ExpenseDetails = ({
  formData,
  onFormDataChange,
  groups = [],
  members = [],
  errors = {},
  aiSuggestion = null,
  isCategorizing = false,
  categorizeError = null,
  onAcceptAiSuggestion,
  onCategoryUserChange
}) => {
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleInputChange = (field, value) => {
    onFormDataChange(field, value)
  }

  const manual = Boolean(formData.categoryManuallySelected)
  const aiMatchesSelection =
    aiSuggestion && String(formData.category || '') === String(aiSuggestion.slug)
  const aiRing =
    !manual && aiSuggestion && aiMatchesSelection
      ? 'ring-2 ring-violet-400 border-violet-300'
      : manual
        ? 'ring-2 ring-amber-200 border-amber-300'
        : 'border-gray-300'

  const pct =
    aiSuggestion && typeof aiSuggestion.confidence === 'number'
      ? Math.round(aiSuggestion.confidence * 100)
      : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FileText size={20} />
          Expense Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Description"
            placeholder="What was this expense for?"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            required
          />

          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            error={errors.amount}
            required
            step="0.01"
            min="0"
            icon={<DollarSign size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Merchant (optional)"
            placeholder="e.g. Domino's, Uber, Amazon"
            value={formData.merchant || ''}
            onChange={(e) => handleInputChange('merchant', e.target.value)}
            error={errors.merchant}
            icon={<User size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              {manual ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Manual
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-200 flex items-center gap-1">
                  <Sparkles size={12} />
                  AI assisted
                </span>
              )}
            </div>

            <select
              value={formData.category || 'other'}
              onChange={(e) => {
                onCategoryUserChange?.()
                handleInputChange('category', e.target.value)
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${aiRing}`}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>

            {isCategorizing && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Suggesting category…
              </p>
            )}

            {categorizeError && !isCategorizing && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {categorizeError}
              </p>
            )}

            {aiSuggestion && pct != null && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">
                  Suggested:{' '}
                  <span className="font-semibold text-gray-900">{aiSuggestion.labelDisplay}</span>{' '}
                  <span className="text-violet-700">({pct}%)</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs py-1 h-7"
                  onClick={onAcceptAiSuggestion}
                  disabled={!aiSuggestion || isCategorizing}
                >
                  Use suggestion
                </Button>
              </div>
            )}

            {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
          </div>

          <Input
            label="Date"
            type="date"
            value={formData.date || getLocalDateString()}
            onChange={(e) => handleInputChange('date', e.target.value)}
            error={errors.date}
            icon={<Calendar size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <select
              value={formData.groupId || ''}
              onChange={(e) => handleInputChange('groupId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Group</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name} ({group.members?.length || 0} members)
                </option>
              ))}
            </select>
            {errors.groupId && <p className="text-red-600 text-sm mt-1">{errors.groupId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
            <select
              value={formData.paidBy || ''}
              onChange={(e) => handleInputChange('paidBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!formData.groupId || members.length === 0}
            >
              <option value="">Select who paid</option>
              {members.map((member) => (
                <option key={member.id || member.email} value={member.id || member.email}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
            {errors.paidBy && <p className="text-red-600 text-sm mt-1">{errors.paidBy}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Tag size={16} />
            Tags
          </label>
          <Input
            placeholder="Enter tags separated by commas (e.g., vacation, dinner, urgent)"
            value={formData.tags?.join(', ') || ''}
            onChange={(e) =>
              handleInputChange(
                'tags',
                e.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              )
            }
            error={errors.tags}
          />
          <p className="text-gray-500 text-sm mt-1">Tags help you organize and find expenses later</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            placeholder="Add any additional notes about this expense..."
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.notes && <p className="text-red-600 text-sm mt-1">{errors.notes}</p>}
        </div>
      </div>
    </div>
  )
}

export default ExpenseDetails
