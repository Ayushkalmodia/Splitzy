import { useState, useEffect } from 'react'
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUp, 
  ArrowDown,
  PieChart,
  BarChart,
  LineChart
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { expenseService } from '../services/expenseService'

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(false)
  const [expenseData, setExpenseData] = useState({
    totalExpenses: 0,
    averagePerPerson: 0,
    highestCategory: '',
    totalTransactions: 0,
    categoryBreakdown: [],
    personBreakdown: [],
    recentTransactions: []
  })

  useEffect(() => {
    fetchAndProcessData()
  }, [timeRange])

  const fetchAndProcessData = async () => {
    setLoading(true)
    try {
      // Fetch real data from API instead of localStorage
      const expensesData = await expenseService.getExpenses()
      const expenses = expensesData?.items || expensesData || []
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
      
      // Calculate category breakdown
      const categoryMap = {}
      expenses.forEach(exp => {
        if (!categoryMap[exp.category]) {
          categoryMap[exp.category] = 0
        }
        categoryMap[exp.category] += parseFloat(exp.amount) || 0
      })
      
      const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: Number(amount.toFixed(2)),
        change: 0 // We don't have historical data for change calculation
      }))

      // Calculate person breakdown from splits (new data structure)
      const personMap = {}
      expenses.forEach(exp => {
        const splits = exp.splits || []
        
        splits.forEach(split => {
          const personName = split.userId?.name || split.tempName || split.email || 'Unknown'
          
          if (!personMap[personName]) {
            personMap[personName] = { paid: 0, owed: 0 }
          }
          
          const shareAmount = parseFloat(split.amount) || 0
          personMap[personName].owed += shareAmount
        })
        
        // Track who paid
        const payerName = exp.paidBy?.name || 'Unknown'
        if (!personMap[payerName]) {
          personMap[payerName] = { paid: 0, owed: 0 }
        }
        personMap[payerName].paid += parseFloat(exp.amount) || 0
      })

      const personBreakdown = Object.entries(personMap).map(([name, data]) => ({
        name,
        paid: Number(data.paid.toFixed(2)),
        owed: Number(data.owed.toFixed(2))
      }))

      // Get recent transactions
      const recentTransactions = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map(exp => ({
          id: exp.id,
          description: exp.description,
          amount: parseFloat(exp.amount),
          category: exp.category.charAt(0).toUpperCase() + exp.category.slice(1),
          date: exp.date
        }))

      // Find highest category
      const highestCategory = categoryBreakdown.reduce((max, cat) => 
        cat.amount > max.amount ? cat : max
      , { category: '', amount: 0 }).category

      setExpenseData({
        totalExpenses: Number(totalExpenses.toFixed(2)),
        averagePerPerson: Number((totalExpenses / Object.keys(personMap).length).toFixed(2)),
        highestCategory,
        totalTransactions: expenses.length,
        categoryBreakdown,
        personBreakdown,
        recentTransactions
      })
    } catch (error) {
      toast.error('Failed to load analytics data')
      console.error('Error processing analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Track and analyze your expenses</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && (
        <>
          {/* Time Range Selector */}
          <div className="mb-8">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="mt-1 block w-full md:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last 12 months</option>
            </select>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{expenseData.totalExpenses}</p>
          <div className="mt-2 flex items-center text-gray-600">
            <span className="text-sm">Total amount spent</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Average per Person</h3>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{expenseData.averagePerPerson}</p>
          <div className="mt-2 flex items-center text-gray-600">
            <span className="text-sm">Average share per person</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Highest Category</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{expenseData.highestCategory}</p>
          <div className="mt-2 flex items-center text-gray-600">
            <span className="text-sm">Most spent category</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Total Transactions</h3>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{expenseData.totalTransactions}</p>
          <div className="mt-2 flex items-center text-gray-600">
            <span className="text-sm">Total number of expenses</span>
          </div>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h2>
          <div className="space-y-4">
            {expenseData.categoryBreakdown.map((category) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <PieChart className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-900">{category.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-medium">₹{category.amount}</p>
                  <p className="text-sm text-gray-500">
                    {((category.amount / expenseData.totalExpenses) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Person-wise Analysis</h2>
          <div className="space-y-4">
            {expenseData.personBreakdown.map((person) => (
              <div key={person.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-900">{person.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 font-medium">₹{person.paid - person.owed}</p>
                  <p className="text-sm text-gray-500">
                    Paid: ₹{person.paid} • Owed: ₹{person.owed}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenseData.recentTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{transaction.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

export default Analytics 