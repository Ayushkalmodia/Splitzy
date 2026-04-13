import React, { useState, useEffect, useCallback } from 'react'
import { X, DollarSign, CheckCircle, Clock, XCircle, Users, ArrowRightLeft } from 'lucide-react'
import { settlementService } from '../services/settlementService'
import { formatCurrency } from '../utils/currency.js'
import toast from 'react-hot-toast'

const SettlementModal = ({ 
  isOpen, 
  onClose, 
  groupId, 
  groupMembers = [], 
  onSettlementCreated 
}) => {
  const getErrorMessage = (error, fallbackMessage) => {
    if (typeof error === 'string') return error
    if (error?.response?.data?.message) return error.response.data.message
    if (error?.message) return error.message
    return fallbackMessage
  }

  const getMemberUserId = (member) => {
    if (!member) return ''
    if (member._id) return member._id
    if (member.userId && typeof member.userId === 'object') {
      return member.userId._id || ''
    }
    if (typeof member.userId === 'string') {
      return member.userId
    }
    return ''
  }

  const selectableMembers = (groupMembers || []).filter((member) => Boolean(getMemberUserId(member)))

  const [activeTab, setActiveTab] = useState('suggestions')
  const [suggestions, setSuggestions] = useState([])
  const [settlements, setSettlements] = useState([])
  const [formData, setFormData] = useState({
    fromUser: '',
    toUser: '',
    amount: '',
    method: 'manual',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await settlementService.getSettlementSuggestions(groupId)
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      toast.error('Failed to load settlement suggestions')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  const fetchSettlements = useCallback(async () => {
    try {
      const data = await settlementService.getSettlementsByGroup(groupId)
      setSettlements(data.items || [])
    } catch (error) {
      console.error('Error fetching settlements:', error)
      toast.error('Failed to load settlements')
    }
  }, [groupId])

  useEffect(() => {
    if (isOpen && groupId) {
      fetchSuggestions()
      fetchSettlements()
    }
  }, [isOpen, groupId, fetchSuggestions, fetchSettlements])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value ?? '' }))
  }

  const createSettlement = async (settlementData) => {
    const normalizedFromUser = settlementData.fromUser ? String(settlementData.fromUser).trim() : ''
    const normalizedToUser = settlementData.toUser ? String(settlementData.toUser).trim() : ''

    // Validation: ensure required fields are present
    if (!normalizedFromUser || !normalizedToUser) {
      toast.error('Please select both From and To users')
      return
    }
    if (normalizedFromUser === normalizedToUser) {
      toast.error('From and To users must be different')
      return
    }
    if (!settlementData.amount || parseFloat(settlementData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setIsSubmitting(true)
    try {
      await settlementService.createSettlement({
        ...settlementData,
        fromUser: normalizedFromUser,
        toUser: normalizedToUser,
        groupId,
        amount: parseFloat(settlementData.amount)
      })
      toast.success('Settlement created successfully')
      onSettlementCreated && onSettlementCreated()
      fetchSuggestions()
      fetchSettlements()
      resetForm()
    } catch (error) {
      console.error('Error creating settlement:', error)
      toast.error(getErrorMessage(error, 'Failed to create settlement'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    const fromUserId = suggestion?.fromUser?.userId || suggestion?.fromUser?._id || ''
    const toUserId = suggestion?.toUser?.userId || suggestion?.toUser?._id || ''

    if (!fromUserId || !toUserId) {
      toast.error('Settlement suggestions with guest members must be created manually')
      return
    }

    setFormData({
      fromUser: fromUserId,
      toUser: toUserId,
      amount: suggestion.amount.toString(),
      method: 'manual',
      notes: ''
    })
    setActiveTab('create')
  }

  const confirmSettlement = async (settlementId) => {
    try {
      await settlementService.confirmSettlement(settlementId)
      toast.success('Settlement confirmed')
      fetchSettlements()
    } catch (error) {
      toast.error(error.message || 'Failed to confirm settlement')
    }
  }

  const cancelSettlement = async (settlementId) => {
    if (!confirm('Are you sure you want to cancel this settlement?')) {
      return
    }
    
    try {
      await settlementService.cancelSettlement(settlementId)
      toast.success('Settlement cancelled')
      fetchSettlements()
    } catch (error) {
      toast.error(error.message || 'Failed to cancel settlement')
    }
  }

  const resetForm = () => {
    setFormData({
      fromUser: '',
      toUser: '',
      amount: '',
      method: 'manual',
      notes: ''
    })
  }

  const getMemberName = (userRef) => {
    if (userRef && typeof userRef === 'object') {
      return userRef.name || userRef.email || 'Unknown'
    }
    const member = (groupMembers || []).find(m => 
      (m._id === userRef) || (m.userId?._id === userRef) || (m.userId === userRef)
    )
    return member?.name || member?.userId?.name || member?.email || member?.tempName || 'Unknown'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-600" />
      default: return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-50 text-red-800 border-red-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Settlements
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'suggestions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Create Settlement
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              History
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Suggested Settlements</h3>
              
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No settlement suggestions available</p>
                  <p className="text-sm">All balances are settled!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getMemberName(suggestion.fromUser)}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium">{getMemberName(suggestion.toUser)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-800">
                          {formatCurrency(suggestion.amount)}
                        </span>
                        <button className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                          Use This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Settlement Tab */}
          {activeTab === 'create' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Create New Settlement</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                createSettlement(formData)
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From (Who paid)
                    </label>
                    <select
                      name="fromUser"
                      value={formData.fromUser || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select person</option>
                      {selectableMembers.map(member => (
                        <option key={getMemberUserId(member)} value={getMemberUserId(member)}>
                          {member.name || member.userId?.name || member.tempName || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To (Who receives)
                    </label>
                    <select
                      name="toUser"
                      value={formData.toUser || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select person</option>
                      {selectableMembers.map(member => (
                        <option key={getMemberUserId(member)} value={getMemberUserId(member)}>
                          {member.name || member.userId?.name || member.tempName || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Method
                    </label>
                    <select
                      name="method"
                      value={formData.method}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="digital">Digital Payment</option>
                    </select>
                  </div>
                </div>

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
                    placeholder="Add any notes about this settlement..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Settlement'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Settlement History</h3>
              
              {settlements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No settlements found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(settlement.status)}
                        <div>
                          <div className="font-medium">
                            {getMemberName(settlement.fromUser)} → {getMemberName(settlement.toUser)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {settlement.method} • {new Date(settlement.createdAt).toLocaleDateString()}
                          </div>
                          {settlement.notes && (
                            <div className="text-sm text-gray-600 mt-1">{settlement.notes}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-800">
                          {formatCurrency(settlement.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(settlement.status)}`}>
                            {settlement.status}
                          </span>
                          {settlement.status === 'pending' && (
                            <>
                              <button
                                onClick={() => confirmSettlement(settlement._id)}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => cancelSettlement(settlement._id)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettlementModal
