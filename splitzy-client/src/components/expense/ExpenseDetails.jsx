import React from 'react'
import { DollarSign, Calendar, Tag, FileText } from 'lucide-react'
import Input from '../ui/Input.jsx'

const ExpenseDetails = ({ 
  formData, 
  onFormDataChange, 
  groups = [], 
  members = [],
  errors = {}
}) => {
  const categories = [
    { id: 'food', label: 'Food & Dining', icon: 'Food' },
    { id: 'transport', label: 'Transportation', icon: 'Transport' },
    { id: 'accommodation', label: 'Accommodation', icon: 'Hotel' },
    { id: 'entertainment', label: 'Entertainment', icon: 'Game' },
    { id: 'shopping', label: 'Shopping', icon: 'Cart' },
    { id: 'utilities', label: 'Utilities', icon: 'Bolt' },
    { id: 'other', label: 'Other', icon: 'Package' }
  ]

  const handleInputChange = (field, value) => {
    onFormDataChange({
      ...formData,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category || 'other'}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} - {category.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category}</p>
            )}
          </div>
          
          <Input
            label="Date"
            type="date"
            value={formData.date || new Date().toISOString().split('T')[0]}
            onChange={(e) => handleInputChange('date', e.target.value)}
            error={errors.date}
            icon={<Calendar size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group
            </label>
            <select
              value={formData.groupId || ''}
              onChange={(e) => handleInputChange('groupId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Group (Personal Expense)</option>
              {groups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.name} ({group.members?.length || 0} members)
                </option>
              ))}
            </select>
            {errors.groupId && (
              <p className="text-red-600 text-sm mt-1">{errors.groupId}</p>
            )}
          </div>
          
          {formData.groupId && members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid By
              </label>
              <select
                value={formData.paidBy || ''}
                onChange={(e) => handleInputChange('paidBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select who paid</option>
                {members.map(member => (
                  <option key={member.id || member.email} value={member.id || member.email}>
                    {member.name || member.email} {member.isTemporary ? '(Guest)' : ''}
                  </option>
                ))}
              </select>
              {errors.paidBy && (
                <p className="text-red-600 text-sm mt-1">{errors.paidBy}</p>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Tag size={16} />
            Tags
          </label>
          <Input
            placeholder="Enter tags separated by commas (e.g., vacation, dinner, urgent)"
            value={formData.tags?.join(', ') || ''}
            onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
            error={errors.tags}
          />
          <p className="text-gray-500 text-sm mt-1">
            Tags help you organize and find expenses later
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            placeholder="Add any additional notes about this expense..."
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpenseDetails
