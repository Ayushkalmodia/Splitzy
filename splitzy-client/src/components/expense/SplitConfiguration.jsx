import React, { useState, useEffect } from 'react'
import { Users, Percent, Hash, Calculator } from 'lucide-react'
import { roundToTwo, parseCurrency, currencyEquals } from '../../utils/currency.js'
import Input from '../ui/Input.jsx'

const SplitConfiguration = ({ 
  splitType, 
  amount, 
  members, 
  splits, 
  onSplitsChange,
  errors = {}
}) => {
  const [localSplits, setLocalSplits] = useState([])

  useEffect(() => {
    setLocalSplits(splits || [])
  }, [splits])

  useEffect(() => {
    if (splitType === 'equal' && members.length > 0 && amount) {
      const equalAmount = roundToTwo(amount / members.length)
      const equalSplits = members.map(member => ({
        id: member.id || member.email,
        userId: member.userId,
        email: member.email,
        name: member.name || member.email,
        amount: equalAmount,
        percentage: roundToTwo(100 / members.length),
        shares: 1,
        isTemporary: member.isTemporary
      }))
      setLocalSplits(equalSplits)
      onSplitsChange(equalSplits)
    }
  }, [splitType, members, amount, onSplitsChange])

  useEffect(() => {
    if (splitType !== 'equal' && members.length > 0 && localSplits.length === 0) {
      const baseAmount = members.length ? roundToTwo((amount || 0) / members.length) : 0
      const initialSplits = members.map((member) => ({
        id: member.id || member.userId,
        userId: member.userId,
        email: member.email,
        name: member.name || member.email,
        amount: baseAmount,
        percentage: members.length ? roundToTwo(100 / members.length) : 0,
        shares: 1,
        isTemporary: false
      }))
      setLocalSplits(initialSplits)
      onSplitsChange(initialSplits)
    }
  }, [splitType, members, amount, localSplits.length, onSplitsChange])

  const handleSplitChange = (index, field, value) => {
    const updatedSplits = [...localSplits]
    const split = updatedSplits[index]
    
    switch (field) {
      case 'name':
        split.name = value
        break
      case 'email':
        split.email = value
        break
      case 'amount':
        split.amount = parseCurrency(value)
        if (splitType === 'percentage' && amount) {
          split.percentage = roundToTwo((split.amount / amount) * 100)
        } else if (splitType === 'shares') {
          // Recalculate percentages based on shares
          const totalShares = updatedSplits.reduce((sum, s) => sum + (s.shares || 0), 0)
          if (totalShares > 0) {
            updatedSplits.forEach(s => {
              s.percentage = roundToTwo((s.shares / totalShares) * 100)
              s.amount = roundToTwo((s.shares / totalShares) * amount)
            })
          }
        }
        break
      case 'percentage':
        split.percentage = parseCurrency(value)
        if (amount) {
          split.amount = roundToTwo((split.percentage / 100) * amount)
        }
        break
      case 'shares':
        split.shares = parseCurrency(value)
        // Recalculate amounts and percentages
        {
          const totalShares = updatedSplits.reduce((sum, s) => sum + (s.shares || 0), 0)
          if (totalShares > 0) {
            updatedSplits.forEach(s => {
              s.percentage = roundToTwo((s.shares / totalShares) * 100)
              s.amount = roundToTwo((s.shares / totalShares) * amount)
            })
          }
        }
        break
    }
    
    setLocalSplits(updatedSplits)
    onSplitsChange(updatedSplits)
  }

  const getTotalAmount = () => {
    return localSplits.reduce((sum, split) => sum + (split.amount || 0), 0)
  }

  const getTotalPercentage = () => {
    return localSplits.reduce((sum, split) => sum + (split.percentage || 0), 0)
  }

  const renderSplitInput = (split, index) => {
    const commonFields = (
      <>
        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm">
          {split.name || split.email || 'Member'}
        </div>
      </>
    )

    switch (splitType) {
      case 'equal':
        return (
          <div className="flex items-center gap-2">
            {commonFields}
            <div className="w-24 text-right font-medium">
              ${split.amount || 0}
            </div>
          </div>
        )
      
      case 'unequal':
        return (
          <div className="flex items-center gap-2">
            {commonFields}
            <Input
              type="number"
              placeholder="Amount"
              value={split.amount || ''}
              onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
              error={errors[`splits.${index}.amount`]}
              className="w-24"
              step="0.01"
              min="0"
            />
            <div className="w-16 text-right text-sm text-gray-500">
              {split.percentage || 0}%
            </div>
          </div>
        )
      
      case 'percentage':
        return (
          <div className="flex items-center gap-2">
            {commonFields}
            <Input
              type="number"
              placeholder="%"
              value={split.percentage || ''}
              onChange={(e) => handleSplitChange(index, 'percentage', e.target.value)}
              error={errors[`splits.${index}.percentage`]}
              className="w-20"
              step="0.01"
              min="0"
              max="100"
            />
            <div className="w-24 text-right font-medium">
              ${split.amount || 0}
            </div>
          </div>
        )
      
      case 'shares':
        return (
          <div className="flex items-center gap-2">
            {commonFields}
            <Input
              type="number"
              placeholder="Shares"
              value={split.shares || ''}
              onChange={(e) => handleSplitChange(index, 'shares', e.target.value)}
              error={errors[`splits.${index}.shares`]}
              className="w-20"
              step="1"
              min="0"
            />
            <div className="w-16 text-right text-sm text-gray-500">
              {split.percentage || 0}%
            </div>
            <div className="w-24 text-right font-medium">
              ${split.amount || 0}
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {splitType === 'equal' && <Users size={20} />}
        {splitType === 'unequal' && <Calculator size={20} />}
        {splitType === 'percentage' && <Percent size={20} />}
        {splitType === 'shares' && <Hash size={20} />}
        <h3 className="font-medium capitalize">{splitType} Split</h3>
      </div>

      <div className="space-y-2">
        {localSplits.map((split, index) => (
          <div key={split.id || index} className="flex items-center gap-2">
            {renderSplitInput(split, index)}
          </div>
        ))}
      </div>

      {/* Validation Summary */}
      <div className="border-t pt-4">
        <div className="flex justify-between text-sm">
          <span>Total Amount:</span>
          <span className={`font-medium ${!currencyEquals(getTotalAmount(), amount) ? 'text-red-600' : ''}`}>
            ${getTotalAmount()}
          </span>
        </div>
        {splitType === 'percentage' && (
          <div className="flex justify-between text-sm">
            <span>Total Percentage:</span>
            <span className={`font-medium ${!currencyEquals(getTotalPercentage(), 100) ? 'text-red-600' : ''}`}>
              {getTotalPercentage()}%
            </span>
          </div>
        )}
        {errors.splits && (
          <div className="text-red-600 text-sm mt-2">{errors.splits}</div>
        )}
      </div>
    </div>
  )
}

export default SplitConfiguration
