import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Users, 
  CreditCard, 
  TrendingUp, 
  ArrowRight,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  User,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
  Search,
  Filter,
  BarChart2
} from 'lucide-react'
import { FaPlus, FaTrash, FaUsers, FaMoneyBillWave, FaChartPie } from 'react-icons/fa'
import ExpenseForm from '../components/ExpenseForm'
import { toast } from 'react-hot-toast'

const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('expenses')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalOwed: 0,
    totalReceived: 0
  })

  const [groups, setGroups] = useState([])

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'food',
    group: '',
    splitBetween: []
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!storedUser || !token) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(storedUser))
    fetchExpenses()
    fetchGroups()
  }, [navigate])

  const fetchGroups = () => {
    try {
      const storedGroups = JSON.parse(localStorage.getItem('groups')) || []
      setGroups(storedGroups)
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast.error('Failed to load groups')
    }
  }

  const fetchExpenses = () => {
    try {
      const storedExpenses = JSON.parse(localStorage.getItem('expenses')) || []
      setExpenses(storedExpenses)
      calculateStats(storedExpenses)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (expenses) => {
    try {
      const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
      const totalOwed = expenses.reduce((sum, expense) => {
        if (expense.paidBy !== user?.email) {
          return sum + Number(expense.amount) / expense.splitBetween.length
        }
        return sum
      }, 0)
      const totalReceived = expenses.reduce((sum, expense) => {
        if (expense.paidBy === user?.email) {
          return sum + Number(expense.amount) - (Number(expense.amount) / expense.splitBetween.length)
        }
        return sum
      }, 0)

      setStats({
        totalSpent: Number(totalSpent.toFixed(2)),
        totalOwed: Number(totalOwed.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
      setStats({ totalSpent: 0, totalOwed: 0, totalReceived: 0 })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleAddExpense = (expense) => {
    try {
      const newExpense = {
        ...expense,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      }
      const updatedExpenses = [...expenses, newExpense]
      localStorage.setItem('expenses', JSON.stringify(updatedExpenses))
      setExpenses(updatedExpenses)
      calculateStats(updatedExpenses)
      toast.success('Expense added successfully')
    } catch (error) {
      console.error('Error adding expense:', error)
      toast.error('Failed to add expense')
    }
  }

  const handleEditExpense = (expense) => {
    try {
      const updatedExpenses = expenses.map((e) =>
        e.id === expense.id ? { ...e, ...expense } : e
      )
      localStorage.setItem('expenses', JSON.stringify(updatedExpenses))
      setExpenses(updatedExpenses)
      calculateStats(updatedExpenses)
      toast.success('Expense updated successfully')
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleDeleteExpense = (expenseId) => {
    try {
      const updatedExpenses = expenses.filter((e) => e.id !== expenseId)
      localStorage.setItem('expenses', JSON.stringify(updatedExpenses))
      setExpenses(updatedExpenses)
      calculateStats(updatedExpenses)
      toast.success('Expense deleted successfully')
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const handleAddGroup = (e) => {
    e.preventDefault()
    // Add group logic here
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.group.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Navbar with Glassmorphism */}
      <nav className="backdrop-blur-lg bg-white/70 border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo with Animation */}
            <div className="flex items-center space-x-2 group">
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg transform group-hover:scale-110 transition-all duration-300">
                <FaChartPie className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Splitzy</span>
            </div>

            {/* User Profile with Enhanced Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 focus:outline-none group"
              >
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-800 group-hover:text-teal-600 transition-colors">{user?.name}</p>
                  <p className="text-xs text-neutral-500">View Profile</p>
                </div>
                <div className="relative">
                  <img
                    src={user?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')}
                    alt="User Avatar"
                    className="h-9 w-9 rounded-full ring-2 ring-neutral-100 group-hover:ring-teal-100 transition-all"
                  />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white"></div>
                </div>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Enhanced Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg py-1 z-10 border border-neutral-200 transform origin-top-right transition-all duration-200">
                  <button
                    onClick={() => {/* Handle profile */}}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-teal-50 transition-colors"
                  >
                    <User className="h-4 w-4 mr-2 text-teal-600" />
                    Profile
                  </button>
                  <button
                    onClick={() => {/* Handle settings */}}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-neutral-700 hover:bg-teal-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2 text-teal-600" />
                    Settings
                  </button>
                  <div className="border-t border-neutral-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Spent</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1 group-hover:text-teal-600 transition-colors">
                  ₹{stats.totalSpent.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl transform group-hover:scale-110 transition-all duration-300">
                <FaMoneyBillWave className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-amber-600 font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                12%
              </span>
              <span className="text-sm text-neutral-500 ml-1">from last month</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">You Owe</p>
                <p className="text-2xl font-bold text-red-600 mt-1 group-hover:text-teal-600 transition-colors">
                  ₹{stats.totalOwed.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl transform group-hover:scale-110 transition-all duration-300">
                <FaMoneyBillWave className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-neutral-500">Across all groups</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 border border-neutral-200 hover:border-teal-100 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">You're Owed</p>
                <p className="text-2xl font-bold text-green-600 mt-1 group-hover:text-teal-600 transition-colors">
                  ₹{stats.totalReceived.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-3 rounded-xl transform group-hover:scale-110 transition-all duration-300">
                <FaMoneyBillWave className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-teal-600 font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                2 pending settlements
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => {
              setEditingExpense(null)
              setShowExpenseForm(true)
            }}
            className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-4 rounded-xl flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-teal-200 transition-all duration-300 transform hover:scale-105"
          >
            <FaPlus className="h-5 w-5" />
            <span>Add Expense</span>
          </button>
          <button 
            onClick={() => navigate('/groups')}
            className="bg-white text-teal-600 p-4 rounded-xl flex items-center justify-center space-x-2 border border-teal-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300 transform hover:scale-105"
          >
            <FaUsers className="h-5 w-5" />
            <span>Create Group</span>
          </button>
          <button className="bg-white text-teal-600 p-4 rounded-xl flex items-center justify-center space-x-2 border border-teal-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300 transform hover:scale-105">
            <BarChart3 className="h-5 w-5" />
            <span>View Reports</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="bg-white text-teal-600 p-4 rounded-xl flex items-center justify-center space-x-2 border border-teal-100 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300 transform hover:scale-105"
          >
            <BarChart2 className="h-5 w-5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Tabs with Enhanced Design */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-neutral-200 mb-8 overflow-hidden">
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`${
                  activeTab === 'expenses'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200`}
              >
                <FaMoneyBillWave className="mr-2" />
                Expenses
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`${
                  activeTab === 'groups'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200`}
              >
                <FaUsers className="mr-2" />
                Groups
              </button>
            </nav>
          </div>

          {/* Content with Enhanced Cards */}
          <div className="p-6">
            {activeTab === 'expenses' ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-bold text-neutral-900">Recent Expenses</h2>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-2 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="food">Food & Dining</option>
                      <option value="transport">Transportation</option>
                      <option value="accommodation">Accommodation</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="shopping">Shopping</option>
                      <option value="utilities">Utilities</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Expenses List */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200">
                  <div className="p-6 border-b border-neutral-200">
                    <h2 className="text-xl font-semibold text-neutral-900">Recent Expenses</h2>
                  </div>
                  <div className="divide-y divide-neutral-200">
                    {filteredExpenses.length === 0 ? (
                      <div className="px-6 py-4 text-center text-gray-500">
                        No expenses yet. Add your first expense!
                      </div>
                    ) : (
                      filteredExpenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="p-6 flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-neutral-900">{expense.description}</h3>
                            <p className="text-sm text-neutral-600">
                              {expense.group} • {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-neutral-900">
                              ₹{Number(expense.amount).toFixed(2)}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingExpense(expense)
                                  setShowExpenseForm(true)
                                }}
                                className="p-2 text-neutral-600 hover:text-teal-600 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-2 text-neutral-600 hover:text-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-neutral-900">Your Groups</h2>
                  <button
                    onClick={() => {/* Handle create group */}}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300 transform hover:scale-105"
                  >
                    <FaPlus className="mr-2" />
                    Create Group
                  </button>
                </div>

                {/* Enhanced Group Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groups.map((group) => (
                    <div key={group.id} className="bg-white rounded-xl border border-neutral-200 p-6 hover:border-teal-100 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-neutral-900 group-hover:text-teal-600 transition-colors">{group.name}</h4>
                        <span className="px-3 py-1 text-sm font-medium text-teal-600 bg-teal-50 rounded-full">
                          {group.members.length} members
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center text-neutral-600">
                          <CreditCard className="h-5 w-5 mr-2 text-teal-600" />
                          <span>Total: ₹{group.totalExpenses}</span>
                        </div>
                        <div className="flex items-center text-neutral-600">
                          <Activity className="h-5 w-5 mr-2 text-teal-600" />
                          <span>Last activity: {group.lastActivity}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button
                          onClick={() => {/* Handle view group */}}
                          className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors group-hover:scale-105 transform"
                        >
                          View Details
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        )}

        {/* Expense Form Modal */}
        <ExpenseForm
          isOpen={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false)
            setEditingExpense(null)
          }}
          onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
          initialData={editingExpense}
          groups={groups}
        />
      </div>
    </div>
  )
}

export default Dashboard 