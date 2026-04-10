import React from 'react'
import { Plus, Search, FileText } from 'lucide-react'

const EmptyState = ({ 
  type = 'expenses', 
  onAction,
  actionText 
}) => {
  const emptyStates = {
    expenses: {
      icon: <FileText className="h-12 w-12 text-neutral-400" />,
      title: 'No expenses yet',
      description: 'Start by adding your first expense to track your spending',
      actionText: actionText || 'Add Expense'
    },
    search: {
      icon: <Search className="h-12 w-12 text-neutral-400" />,
      title: 'No expenses found',
      description: 'Try adjusting your search or filter criteria',
      actionText: null
    },
    groups: {
      icon: <Users className="h-12 w-12 text-neutral-400" />,
      title: 'No groups yet',
      description: 'Create your first group to start splitting expenses with friends',
      actionText: actionText || 'Create Group'
    }
  }

  const config = emptyStates[type] || emptyStates.expenses

  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-neutral-100 rounded-full">
          {config.icon}
        </div>
      </div>
      <h3 className="text-lg font-medium text-neutral-900 mb-2">
        {config.title}
      </h3>
      <p className="text-neutral-600 mb-6 max-w-sm mx-auto">
        {config.description}
      </p>
      {config.actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-teal-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {config.actionText}
        </button>
      )}
    </div>
  )
}

export default EmptyState
