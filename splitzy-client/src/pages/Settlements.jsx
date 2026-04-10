import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Wallet, 
  Banknote, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Bell,
  ArrowRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { settlementService } from '../services/settlementService'

const Settlements = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState(null)
  const [settlements, setSettlements] = useState({
    pending: [],
    completed: []
  })

  useEffect(() => {
    loadSettlements()
  }, [])

  const loadSettlements = async () => {
    try {
      const settlementsData = await settlementService.getSettlements()
      const settlements = settlementsData?.items || settlementsData || []
      
      const pending = settlements.filter(s => s.status === 'pending')
      const completed = settlements.filter(s => s.status === 'confirmed')
      
      setSettlements({
        pending,
        completed
      })
    } catch (error) {
      toast.error('Failed to load settlements')
      console.error('Error loading settlements:', error)
    }
  }

  const handleSettle = (settlement) => {
    try {
      // Move settlement from pending to completed
      const updatedSettlements = {
        pending: settlements.pending.filter(s => s.id !== settlement.id),
        completed: [...settlements.completed, { ...settlement, status: 'completed' }]
      }
      setSettlements(updatedSettlements)
      toast.success('Settlement marked as completed')
    } catch (error) {
      toast.error('Failed to process settlement')
      console.error('Error processing settlement:', error)
    }
  }

  const handleSendReminder = (settlement) => {
    setSelectedSettlement(settlement)
    setShowReminderModal(true)
  }

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'UPI':
        return <CreditCard className="w-5 h-5" />
      case 'Bank Transfer':
        return <Banknote className="w-5 h-5" />
      case 'Cash':
        return <Wallet className="w-5 h-5" />
      default:
        return <CreditCard className="w-5 h-5" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settlements</h1>
        <p className="text-gray-600 mt-2">Manage and track your expense settlements</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Pending Settlements
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Settlement History
          </button>
        </nav>
      </div>

      {/* Settlements List */}
      <div className="space-y-4">
        {settlements[activeTab].length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No {activeTab} settlements found</p>
          </div>
        ) : (
          settlements[activeTab].map((settlement) => (
            <div
              key={settlement.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getPaymentMethodIcon(settlement.paymentMethod)}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {settlement.from} → {settlement.to}
                    </h3>
                    <p className="text-sm text-gray-500">{settlement.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{settlement.amount}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(settlement.date).toLocaleDateString()}
                    </p>
                  </div>
                  {activeTab === 'pending' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSendReminder(settlement)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Send Reminder"
                      >
                        <Bell className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleSettle(settlement)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Settle
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="w-5 h-5 mr-1" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reminder Modal */}
      {showReminderModal && selectedSettlement && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Send Reminder</h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Send a reminder to {selectedSettlement.from} about the pending payment of ₹
              {selectedSettlement.amount}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('Reminder sent successfully')
                  setShowReminderModal(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settlements 