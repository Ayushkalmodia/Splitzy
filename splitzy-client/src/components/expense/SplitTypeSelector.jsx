import React from 'react'
import { Users, Calculator, Percent, Hash } from 'lucide-react'

const SplitTypeSelector = ({ splitType, onSplitTypeChange, disabled = false }) => {
  const splitTypes = [
    {
      id: 'equal',
      label: 'Equal Split',
      description: 'Everyone pays the same amount',
      icon: <Users size={20} />,
      recommended: true
    },
    {
      id: 'unequal',
      label: 'Custom Amounts',
      description: 'Specify exact amounts for each person',
      icon: <Calculator size={20} />
    },
    {
      id: 'percentage',
      label: 'Percentage Split',
      description: 'Divide by percentages (must total 100%)',
      icon: <Percent size={20} />
    },
    {
      id: 'shares',
      label: 'Shares Split',
      description: 'Divide by ratio/shares',
      icon: <Hash size={20} />
    }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Split Type</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {splitTypes.map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSplitTypeChange(type.id)}
            disabled={disabled}
            className={`
              relative p-4 border-2 rounded-lg text-left transition-all
              ${splitType === type.id 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${splitType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {type.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{type.label}</span>
                  {type.recommended && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {type.description}
                </p>
              </div>
              
              {splitType === type.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Split Type Explanations */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Quick Guide:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><strong>Equal:</strong> Best for shared meals, group activities</li>
          <li><strong>Custom:</strong> When amounts vary per person</li>
          <li><strong>Percentage:</strong> For income-based or proportional splits</li>
          <li><strong>Shares:</strong> When using ratios (e.g., 2:1:1 split)</li>
        </ul>
      </div>
    </div>
  )
}

export default SplitTypeSelector
