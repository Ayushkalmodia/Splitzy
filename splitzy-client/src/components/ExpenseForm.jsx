import { useState, useEffect } from 'react'
import { X, DollarSign, Calendar, Users, Tag, FileText, Percent, Equal } from 'lucide-react'
import { authService } from '../services/authService'

const ExpenseForm = ({ isOpen, onClose, onSubmit, initialData = null, groups = [] }) => {
  const [formData, setFormData] = useState(initialData || {
    description: '',
    amount: '',
    category: 'food',
    group: '',
    date: new Date().toISOString().split('T')[0],
    paidBy: '',
    splitType: 'equal', // 'equal', 'custom', 'percentage'
    splitBetween: []
  })

  const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
  const currentUser = authService.getCurrentUser()

  const categories = [
    { id: 'food', label: 'Food & Dining', icon: '🍽️' },
    { id: 'transport', label: 'Transportation', icon: '🚗' },
    { id: 'accommodation', label: 'Accommodation', icon: '🏨' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎮' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️' },
    { id: 'utilities', label: 'Utilities', icon: '💡' },
    { id: 'other', label: 'Other', icon: '📦' }
  ]

  // Update group members when group changes
  useEffect(() => {
    if (formData.group) {
      const group = groups.find(g => g._id === formData.group)
      if (group) {
        setSelectedGroupMembers(group.members)
        // Default paidBy to current user if present in group, otherwise first member
        if (currentUser?.email && group.members.includes(currentUser.email)) {
          setFormData((prev) => ({ ...prev, paidBy: currentUser.email }))
        } else if (!formData.paidBy) {
          setFormData((prev) => ({ ...prev, paidBy: group.members[0] || '' }))
        }
      }
    } else {
      setSelectedGroupMembers([])
    }
  }, [formData.group, formData.amount, formData.paidBy, groups, currentUser?.email])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.paidBy) {
      alert("Please select who paid for this expense")
      return
    }
    const finalData = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      groupId: formData.group,
      paidBy: formData.paidBy,
      splitBetween: formData.splitBetween
    }
    onSubmit(finalData)
    onClose()
  }

  const handleMemberToggle = (member) => {
    setFormData((prev) => ({
      ...prev,
      splitBetween: prev.splitBetween.includes(member)
        ? prev.splitBetween.filter((m) => m !== member)
        : [...prev.splitBetween, member],
    }))
  }

  const handleGroupChange = (e) => {
    const selectedGroup = groups.find((g) => g._id === e.target.value)
    setFormData((prev) => ({
      ...prev,
      group: e.target.value,
      splitBetween: selectedGroup ? selectedGroup.members : [],
      paidBy: selectedGroup?.members?.[0] || "",
    }))
  }

  if (!isOpen) return null


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-auto my-8">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-semibold text-neutral-900">
            {initialData ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-teal-600" />
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's this expense for?"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-teal-600" />
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-teal-600" />
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-teal-600" />
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            />
          </div>

          {/* Group */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <Users className="h-4 w-4 mr-2 text-teal-600" />
              Group
            </label>
            <select
              value={formData.group}
              onChange={handleGroupChange}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            >
              <option value="">Select a group</option>
              {groups.map(group => (
                <option key={group._id} value={group._id}>{group.name}</option>
              ))}
            </select>
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              Paid By
            </label>
            <select
              value={formData.paidBy}
              onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            >
              <option value="">Select who paid</option>
              {formData.group &&
                selectedGroupMembers.map((member) => (
                  <option key={member} value={member}>
                    {member === currentUser?.email ? (currentUser?.name || member) : member}
                  </option>
                ))}
            </select>
          </div>

          {/* Split Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 flex items-center">
              <Percent className="h-4 w-4 mr-2 text-teal-600" />
              Split Type
            </label>
            <select
              value={formData.splitType}
              onChange={(e) => setFormData({ ...formData, splitType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
              required
            >
              <option value="equal">Equal Split</option>
              <option value="custom">Custom Split</option>
              <option value="percentage">Percentage Split</option>
            </select>
          </div>

          {/* Split Between */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 mb-2">
              Split Between
            </label>
            <div className="space-y-2">
              {formData.group &&
                selectedGroupMembers.map((member) => (
                  <label
                    key={member}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.splitBetween.includes(member)}
                      onChange={() => handleMemberToggle(member)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{member === currentUser?.email ? (currentUser?.name || member) : member}</span>
                  </label>
                ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white pt-4 border-t border-neutral-200">
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300"
            >
              {initialData ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseForm 