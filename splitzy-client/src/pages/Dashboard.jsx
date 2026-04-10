import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import AdvancedExpenseForm from '../components/AdvancedExpenseForm.jsx'
import { toast } from 'react-hot-toast'
import { expenseService } from '../services/expenseService'
import { groupService } from '../services/groupService'
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

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
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
  const [, setGroups] = useState([])
  const [, setGroupsLoading] = useState(true)

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

  const fetchStats = useMemoizedCallback(async () => {
    try {
      setStatsLoading(true)
      const balanceData = await expenseService.getUserBalance()
      setStats({
        totalSpent: balanceData.groupBalances?.reduce((sum, g) => sum + Math.abs(Number(g.balance) || 0), 0) || 0,
        totalOwed: Number(balanceData.totalOwed) || 0,
        totalReceived: Number(balanceData.totalToReceive) || 0
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

    fetchExpenses()
    fetchGroups()
  }, [user, isAuthenticated, authLoading, navigate, fetchExpenses, fetchGroups])

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
