import React from 'react'
import { Calendar, DollarSign, Tag, Users, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { formatCurrency } from '../../utils/currency.js'
import Button from './Button.jsx'
import { cn } from '../../lib/utils'

const ExpenseCardComponent = ({ 
  expense, 
  groupName, 
  onEdit, 
  onDelete,
  className 
}) => {
  const getCategoryData = (category) => {
    const categories = {
      food: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'Food' },
      transport: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'Transport' },
      accommodation: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: 'Hotel' },
      entertainment: { color: 'bg-pink-100 text-pink-700 border-pink-200', icon: 'Game' },
      shopping: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: 'Cart' },
      utilities: { color: 'bg-green-100 text-green-700 border-green-200', icon: 'Bolt' },
      other: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'Package' }
    }
    return categories[category] || categories.other
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const categoryData = getCategoryData(expense.category)

  return (
    <div className={cn(
      'group bg-white/90 backdrop-blur-sm rounded-2xl border border-neutral-200/50 hover:border-teal-200/50 hover:shadow-lg hover:shadow-teal-100/20 transition-all duration-300 overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2 truncate group-hover:text-teal-700 transition-colors">
              {expense.description}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
              <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-lg">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">{formatDate(expense.date || expense.createdAt)}</span>
              </div>
              
              {groupName && (
                <div className="flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span className="font-medium text-teal-700">{groupName}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(expense)}
              className="p-2 hover:bg-teal-50 hover:text-teal-600 rounded-lg"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(expense._id)}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Amount and Category */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <DollarSign className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-xs text-neutral-500">Total amount</p>
            </div>
          </div>
          
          <div className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border',
            categoryData.color
          )}>
            {categoryData.icon} {expense.category?.charAt(0).toUpperCase() + expense.category?.slice(1)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        {expense.notes && (
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg">
            <p className="text-sm text-neutral-600 italic">
              "{expense.notes}"
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-neutral-600">Paid by</span>
            <span className="font-medium text-neutral-900 bg-neutral-100 px-2 py-1 rounded">
              {expense.paidBy?.name || expense.paidBy?.email || 'Someone'}
            </span>
          </div>
          
          {(expense.splits?.length > 0 || expense.splitBetween?.length > 0) && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-600">Split</span>
              <span className="font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded">
                {expense.splits?.length || expense.splitBetween?.length} people
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {expense.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
            {expense.tags.length > 3 && (
              <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">
                +{expense.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ExpenseCard = React.memo(ExpenseCardComponent)
ExpenseCard.displayName = 'ExpenseCard'

export default ExpenseCard
