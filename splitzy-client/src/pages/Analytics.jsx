import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  TrendingUp,
  Users,
  CreditCard,
  PieChart,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { expenseService } from '../services/expenseService'
import { formatCurrency } from '../utils/currency.js'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const rangeCutoff = (range) => {
  const d = new Date()
  const ms = d.getTime()
  if (range === 'week') return new Date(ms - 7 * 24 * 60 * 60 * 1000)
  if (range === 'month') return new Date(ms - 30 * 24 * 60 * 60 * 1000)
  return new Date(ms - 365 * 24 * 60 * 60 * 1000)
}

const formatDate = (value) => {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return '—'
  }
}

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [expenseData, setExpenseData] = useState({
    totalExpenses: 0,
    averagePerPerson: 0,
    highestCategory: '',
    totalTransactions: 0,
    categoryBreakdown: [],
    personBreakdown: [],
    recentTransactions: []
  })

  const fetchAndProcessData = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const expensesData = await expenseService.getExpenses()
      const raw = expensesData?.items || expensesData || []
      const expenses = Array.isArray(raw) ? raw : []

      const cutoff = rangeCutoff(timeRange)
      const filtered = expenses.filter((exp) => {
        const t = new Date(exp.date || exp.createdAt)
        return !Number.isNaN(t.getTime()) && t >= cutoff
      })

      const totalExpenses = filtered.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)

      const categoryMap = {}
      filtered.forEach((exp) => {
        const category = exp.category || 'other'
        if (!categoryMap[category]) categoryMap[category] = 0
        categoryMap[category] += parseFloat(exp.amount) || 0
      })

      const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
        category: category ? `${category.charAt(0).toUpperCase()}${category.slice(1)}` : 'Other',
        amount: Number(amount.toFixed(2)),
        change: 0
      }))

      const personMap = {}
      filtered.forEach((exp) => {
        const splits = exp.splits || []
        splits.forEach((split) => {
          const personName = split.userId?.name || split.tempName || split.email || 'Unknown'
          if (!personMap[personName]) personMap[personName] = { paid: 0, owed: 0 }
          personMap[personName].owed += parseFloat(split.amount) || 0
        })
        const payerName = exp.paidBy?.name || 'Unknown'
        if (!personMap[payerName]) personMap[payerName] = { paid: 0, owed: 0 }
        personMap[payerName].paid += parseFloat(exp.amount) || 0
      })

      const personBreakdown = Object.entries(personMap).map(([name, data]) => ({
        name,
        paid: Number(data.paid.toFixed(2)),
        owed: Number(data.owed.toFixed(2))
      }))

      const recentTransactions = [...filtered]
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 5)
        .map((exp) => ({
          id: exp.id || exp._id,
          description: exp.description,
          amount: parseFloat(exp.amount) || 0,
          category: exp.category
            ? `${exp.category.charAt(0).toUpperCase()}${exp.category.slice(1)}`
            : 'Other',
          date: exp.date || exp.createdAt
        }))

      const highestCategory = categoryBreakdown.reduce(
        (max, cat) => (cat.amount > max.amount ? cat : max),
        { category: '', amount: 0 }
      ).category

      const personCount = Math.max(Object.keys(personMap).length, 1)
      setExpenseData({
        totalExpenses: Number(totalExpenses.toFixed(2)),
        averagePerPerson: Number((totalExpenses / personCount).toFixed(2)),
        highestCategory,
        totalTransactions: filtered.length,
        categoryBreakdown,
        personBreakdown,
        recentTransactions
      })
    } catch (error) {
      console.error('Error processing analytics data:', error)
      setLoadError(true)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAndProcessData()
  }, [fetchAndProcessData])

  const rangeLabel = useMemo(() => {
    if (timeRange === 'week') return 'last 7 days'
    if (timeRange === 'month') return 'last 30 days'
    return 'last 12 months'
  }, [timeRange])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
            <p className="text-neutral-600 mt-2">Track and analyze your expenses ({rangeLabel})</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={fetchAndProcessData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-neutral-200 bg-white/80 p-6 animate-pulse h-28"
              />
            ))}
          </div>
        )}

        {loadError && !loading && (
          <div
            className="mb-8 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="alert"
          >
            <div className="flex items-start gap-3 text-red-900">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">We couldn&apos;t load your expenses</p>
                <p className="text-sm text-red-800/90">Check your connection and try again.</p>
              </div>
            </div>
            <Button type="button" size="sm" onClick={fetchAndProcessData}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <div className="mb-8">
              <label htmlFor="analytics-range" className="sr-only">
                Time range
              </label>
              <select
                id="analytics-range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full md:w-56 rounded-xl border border-neutral-200 bg-white/90 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last 12 months</option>
              </select>
            </div>

            {expenseData.totalTransactions === 0 ? (
              <EmptyState
                title="No expenses in this range"
                description="Add expenses on the dashboard or pick a longer time range."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-neutral-500">Total expenses</h3>
                      <CreditCard className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatCurrency(expenseData.totalExpenses)}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">In selected period</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-neutral-500">Average per person</h3>
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatCurrency(expenseData.averagePerPerson)}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">Based on split participants</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-neutral-500">Top category</h3>
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">
                      {expenseData.highestCategory || '—'}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">Highest spend category</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-neutral-500">Transactions</h3>
                      <Calendar className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900">{expenseData.totalTransactions}</p>
                    <p className="mt-2 text-sm text-neutral-600">Expense records</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-neutral-900 mb-4">By category</h2>
                    <div className="space-y-4">
                      {expenseData.categoryBreakdown.map((category) => (
                        <div key={category.category} className="flex items-center justify-between gap-2">
                          <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mr-3 shrink-0">
                              <PieChart className="w-4 h-4 text-teal-700" />
                            </div>
                            <span className="text-neutral-900 truncate">{category.category}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-neutral-900 font-medium">{formatCurrency(category.amount)}</p>
                            <p className="text-sm text-neutral-500">
                              {expenseData.totalExpenses > 0
                                ? ((category.amount / expenseData.totalExpenses) * 100).toFixed(1)
                                : '0.0'}
                              % of total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-neutral-900 mb-4">By person</h2>
                    <div className="space-y-4">
                      {expenseData.personBreakdown.map((person) => (
                        <div key={person.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shrink-0">
                              <Users className="w-4 h-4 text-emerald-700" />
                            </div>
                            <span className="text-neutral-900 truncate">{person.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-neutral-900 font-medium">
                              {formatCurrency(person.paid - person.owed)}
                            </p>
                            <p className="text-sm text-neutral-500">
                              Paid {formatCurrency(person.paid)} · Share {formatCurrency(person.owed)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-sm p-6 shadow-sm overflow-hidden">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent transactions</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {expenseData.recentTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                              {transaction.description}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                              {transaction.category}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                              {formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                              {formatDate(transaction.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Analytics
