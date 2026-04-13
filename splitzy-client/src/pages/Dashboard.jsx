import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  AlertTriangle,
  PiggyBank,
  Trash2,
  Pencil,
  Check
} from 'lucide-react'
import AdvancedExpenseForm from '../components/AdvancedExpenseForm.jsx'
import { toast } from 'react-hot-toast'
import { expenseService } from '../services/expenseService'
import { groupService } from '../services/groupService'
import { budgetService } from '../services/budgetService.js'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import ExpenseCard from '../components/ui/ExpenseCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { formatCurrency } from '../utils/currency.js'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'
import VirtualList from '../components/ui/VirtualList.jsx'
import { useDebounce, useMemoizedCalculation, useMemoizedCallback, useOptimizedFilter } from '../hooks/usePerformance.js'
import { getRealtimeSocket } from '../lib/realtime.js'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth()
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
  const [statsLoading, setStatsLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [, setGroupsLoading] = useState(true)
  const didInitialLoad = useRef(false)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [editingBudgetId, setEditingBudgetId] = useState(null)
  const [editBudgetLimit, setEditBudgetLimit] = useState('')

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Memoized filter function
  const expenseFilter = useMemoizedCalculation(
    () => (expense) => {
      const matchesSearch = !debouncedSearchQuery || 
        expense.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        expense.category?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory
      return matchesSearch && matchesCategory
    },
    [debouncedSearchQuery, selectedCategory]
  )

  // Optimized filtered expenses
  const filteredExpenses = useOptimizedFilter(expenses, expenseFilter)

  // Memoized categories
  const categories = useMemoizedCalculation(
    () => {
      const cats = [...new Set(expenses.map(expense => expense.category).filter(Boolean))]
      return cats.sort()
    },
    [expenses]
  )

  // Memoized callbacks
  const fetchGroups = useMemoizedCallback(async () => {
    try {
      setGroupsLoading(true)
      const data = await groupService.getGroups()
      const groupsArray = data?.items || data || []
      setGroups(Array.isArray(groupsArray) ? groupsArray : [])
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast.error('Failed to load groups')
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  const fetchExpenses = useMemoizedCallback(async () => {
    try {
      setLoading(true)
      const data = await expenseService.getExpenses()
      const expensesArray = data?.items || data || []
      setExpenses(Array.isArray(expensesArray) ? expensesArray : [])
      await fetchStats()
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses')
      setExpenses([]) // Reset on error
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBudgetStatus = useMemoizedCallback(async () => {
    try {
      setBudgetLoading(true)
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const data = await budgetService.getStatus(month)
      setBudgetStatus(data)
    } catch (error) {
      console.error('Error fetching budgets:', error)
      setBudgetStatus(null)
    } finally {
      setBudgetLoading(false)
    }
  }, [])

  const handleAddBudget = useMemoizedCallback(async () => {
    const cat = budgetCategory.trim().toLowerCase()
    const limit = parseFloat(String(budgetLimit).trim())
    if (!cat || Number.isNaN(limit) || limit < 0) {
      toast.error('Enter a category and a non-negative monthly limit')
      return
    }
    try {
      await budgetService.create({ category: cat, monthlyLimit: limit })
      toast.success('Budget saved')
      setBudgetCategory('')
      setBudgetLimit('')
      fetchBudgetStatus()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Could not save budget')
    }
  }, [budgetCategory, budgetLimit, fetchBudgetStatus])

  const handleDeleteBudget = useMemoizedCallback(async (id) => {
    if (!confirm('Remove this budget?')) return
    try {
      await budgetService.remove(id)
      toast.success('Budget removed')
      setEditingBudgetId(null)
      fetchBudgetStatus()
    } catch (error) {
      console.error(error)
      toast.error('Could not remove budget')
    }
  }, [fetchBudgetStatus])

  const handleSaveBudgetEdit = useMemoizedCallback(async () => {
    const lim = parseFloat(String(editBudgetLimit).trim())
    if (!editingBudgetId || Number.isNaN(lim) || lim < 0) {
      toast.error('Enter a valid monthly limit')
      return
    }
    try {
      await budgetService.update(editingBudgetId, { monthlyLimit: lim })
      toast.success('Budget updated')
      setEditingBudgetId(null)
      fetchBudgetStatus()
    } catch (error) {
      console.error(error)
      toast.error('Could not update budget')
    }
  }, [editingBudgetId, editBudgetLimit, fetchBudgetStatus])

  const fetchStats = useMemoizedCallback(async () => {
    try {
      setStatsLoading(true)
      const statsData = await expenseService.getExpenseStats()
      setStats({
        totalSpent: Number(statsData.totalSpent) || 0,
        totalOwed: Number(statsData.totalOwed) || 0,
        totalReceived: Number(statsData.totalReceived) || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({ totalSpent: 0, totalOwed: 0, totalReceived: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const handleDeleteExpense = useMemoizedCallback(async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      await expenseService.deleteExpense(expenseId)
      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }, [fetchExpenses])

  const handleEditExpense = useMemoizedCallback((expense) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }, [])

  const handleExpenseCreated = useMemoizedCallback(() => {
    fetchExpenses()
    setEditingExpense(null)
    setShowExpenseForm(false)
  }, [fetchExpenses])

  useEffect(() => {
    // Wait for auth hydration before deciding redirect/fetch
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!user) {
      return
    }

    if (didInitialLoad.current) {
      return
    }

    didInitialLoad.current = true
    fetchExpenses()
    fetchGroups()
    fetchBudgetStatus()
  }, [user, isAuthenticated, authLoading, navigate, fetchExpenses, fetchGroups, fetchBudgetStatus])

  useEffect(() => {
    const socket = getRealtimeSocket()
    groups.forEach((group) => {
      socket.emit('group:join', group._id)
    })

    const refreshDashboard = () => {
      fetchExpenses()
      fetchStats()
      fetchBudgetStatus()
    }
    socket.on('expense:created', refreshDashboard)
    socket.on('expense:updated', refreshDashboard)
    socket.on('expense:deleted', refreshDashboard)
    socket.on('settlement:created', refreshDashboard)

    return () => {
      socket.off('expense:created', refreshDashboard)
      socket.off('expense:updated', refreshDashboard)
      socket.off('expense:deleted', refreshDashboard)
      socket.off('settlement:created', refreshDashboard)
    }
  }, [groups, fetchExpenses, fetchStats, fetchBudgetStatus])

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      setExpenses([])
      setGroups([])
    }
  }, [])

  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-neutral-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
              <p className="text-sm text-neutral-600">Welcome back, {user?.name}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
              <Button
                onClick={() => navigate('/groups')}
                variant="secondary"
                size="sm"
              >
                <Users size={16} className="mr-2" />
                Groups
              </Button>
              <Button
                onClick={() => setShowExpenseForm(true)}
                size="sm"
              >
                <Plus size={16} className="mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Spent</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-1">
                    {statsLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      formatCurrency(stats.totalSpent)
                    )}
                  </p>
                </div>
                <div className="p-3 bg-teal-100 rounded-full">
                  <CreditCard className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">You Owe</p>
                  <p className="text-2xl font-bold text-red-600 mt-1 flex items-center">
                    {statsLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <ArrowDownRight size={20} className="mr-1" />
                        {formatCurrency(stats.totalOwed)}
                      </>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <ArrowDownRight className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">You're Owed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1 flex items-center">
                    {statsLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <ArrowUpRight size={20} className="mr-1" />
                        {formatCurrency(stats.totalReceived)}
                      </>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly budgets & alerts */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-teal-600" />
              Monthly budgets
              {budgetStatus?.alerts?.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {budgetStatus.alerts.length} alert{budgetStatus.alerts.length > 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetStatus?.insightsError && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Recommendations are temporarily unavailable ({budgetStatus.insightsError}).
              </div>
            )}
            {budgetStatus?.insights?.recommendations?.length > 0 && (
              <ul className="text-sm text-neutral-700 space-y-1 list-disc list-inside border border-neutral-100 rounded-xl p-3 bg-neutral-50/80">
                {budgetStatus.insights.recommendations.slice(0, 5).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            {budgetLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : (budgetStatus?.lines || []).length === 0 ? (
              <p className="text-sm text-neutral-600">
                Set category limits to track your share of group spending this month. We will flag 50%, 80%, and 100% utilization.
              </p>
            ) : (
              <div className="space-y-3">
                {budgetStatus.lines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-xl border border-neutral-200 p-3 bg-white/60"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-neutral-900 capitalize truncate">{line.category}</span>
                        {line.threshold !== 'ok' && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              line.threshold === '100'
                                ? 'bg-red-100 text-red-800'
                                : line.threshold === '80'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-teal-100 text-teal-900'
                            }`}
                          >
                            {line.threshold}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {editingBudgetId === line.id ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editBudgetLimit}
                              onChange={(e) => setEditBudgetLimit(e.target.value)}
                              className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                              aria-label="New monthly limit"
                            />
                            <button
                              type="button"
                              onClick={handleSaveBudgetEdit}
                              className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50"
                              aria-label="Save budget limit"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudgetId(line.id)
                              setEditBudgetLimit(String(line.monthlyLimit))
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            aria-label={`Edit ${line.category} budget`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(line.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`Remove ${line.category} budget`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          line.utilization >= 1
                            ? 'bg-red-500'
                            : line.utilization >= 0.8
                              ? 'bg-amber-500'
                              : line.utilization >= 0.5
                                ? 'bg-teal-500'
                                : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, line.utilization * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      {formatCurrency(line.spent)} of {formatCurrency(line.monthlyLimit)} ({Math.round(line.utilization * 100)}%)
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-100">
              <Input
                placeholder="Category (e.g. food)"
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="sm:flex-1"
              />
              <Input
                placeholder="Monthly limit"
                type="number"
                min="0"
                step="0.01"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="sm:w-40"
              />
              <Button type="button" onClick={handleAddBudget} variant="secondary" className="sm:w-auto">
                Add budget
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border border-neutral-200 rounded-xl bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            >
              <Filter size={16} className="mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">
              Recent Expenses
              <span className="text-sm font-normal text-neutral-600 ml-2">
                ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'})
              </span>
            </h2>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/analytics')}
            >
              <TrendingUp size={16} className="mr-2" />
              View Analytics
            </Button>
          </div>

          {filteredExpenses.length === 0 ? (
            <EmptyState
              title={debouncedSearchQuery || selectedCategory !== 'all' ? 'No expenses found' : 'No expenses yet'}
              description={
                debouncedSearchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Start by adding your first expense to track your spending'
              }
              action={
                debouncedSearchQuery || selectedCategory !== 'all' ? null : (
                  <Button onClick={() => setShowExpenseForm(true)}>
                    <Plus size={16} className="mr-2" />
                    Add First Expense
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Use regular grid for small lists, virtual list for large lists */}
              {filteredExpenses.length <= 50 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense._id}
                      expense={expense}
                      onEdit={() => handleEditExpense(expense)}
                      onDelete={() => handleDeleteExpense(expense._id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-2xl bg-white/50 backdrop-blur-sm">
                  <VirtualList
                    items={filteredExpenses}
                    itemHeight={200}
                    containerHeight={600}
                    renderItem={(expense) => (
                      <div className="p-4">
                        <ExpenseCard
                          expense={expense}
                          onEdit={() => handleEditExpense(expense)}
                          onDelete={() => handleDeleteExpense(expense._id)}
                        />
                      </div>
                    )}
                    className="p-2"
                  />
                </div>
              )}
              
              {/* Show count for large lists */}
              {filteredExpenses.length > 50 && (
                <div className="text-center text-sm text-neutral-600 mt-4">
                  Showing {filteredExpenses.length} expenses
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      <AdvancedExpenseForm
        isOpen={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false)
          setEditingExpense(null)
        }}
        onExpenseCreated={handleExpenseCreated}
        editingExpense={editingExpense}
      />
    </div>
  )
}

export default Dashboard
