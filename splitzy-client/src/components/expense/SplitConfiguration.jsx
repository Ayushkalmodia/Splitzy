import React, { useState, useEffect } from 'react'
import { Users, Percent, Hash, Calculator, Plus, Trash2 } from 'lucide-react'
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

  const handleSplitChange = (index, field, value) => {
    const updatedSplits = [...localSplits]
    const split = updatedSplits[index]
    
    switch (field) {
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

  const addSplit = () => {
    const newSplit = {
      id: Math.random().toString(36).substr(2, 9),
      email: '',
      name: '',
      amount: 0,
      percentage: 0,
      shares: 1,
      isTemporary: true
    }
    setLocalSplits([...localSplits, newSplit])
    onSplitsChange([...localSplits, newSplit])
  }

  const removeSplit = (index) => {
    const updatedSplits = localSplits.filter((_, i) => i !== index)
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
        <Input
          placeholder="Name"
          value={split.name || ''}
          onChange={(e) => handleSplitChange(index, 'name', e.target.value)}
          error={errors[`splits.${index}.name`]}
          className="flex-1"
        />
        <Input
          placeholder="Email"
          value={split.email || ''}
          onChange={(e) => handleSplitChange(index, 'email', e.target.value)}
          error={errors[`splits.${index}.email`]}
          className="flex-1"
        />
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
            <button
              type="button"
              onClick={() => removeSplit(index)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
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
            <button
              type="button"
              onClick={() => removeSplit(index)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
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
            <button
              type="button"
              onClick={() => removeSplit(index)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
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
            <button
              type="button"
              onClick={() => removeSplit(index)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
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

      {(splitType === 'unequal' || splitType === 'percentage' || splitType === 'shares') && (
        <button
          type="button"
          onClick={addSplit}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Plus size={16} />
          Add Person
        </button>
      )}

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
