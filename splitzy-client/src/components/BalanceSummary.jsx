import React, { useState, useEffect, useCallback } from 'react'
import { ArrowDownLeft, ArrowUpRight, Users, DollarSign, TrendingUp, GitBranch } from 'lucide-react'
import { groupService } from '../services/groupService'
import { expenseService } from '../services/expenseService'
import { formatCurrency } from '../utils/currency.js'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card.jsx'
import Button from './ui/Button.jsx'
import toast from 'react-hot-toast'

const uidStr = (v) => {
  if (!v) return ''
  if (typeof v === 'object' && v._id) return v._id.toString()
  return String(v)
}

const partyIsUser = (party, currentUserId, currentUserEmail) => {
  if (!party) return false
  if (currentUserId && uidStr(party.userId) === String(currentUserId)) return true
  if (currentUserEmail && party.email && party.email.toLowerCase() === String(currentUserEmail).toLowerCase()) {
    return true
  }
  return false
}

const BalanceSummary = ({ groupId, userId, onSettleClick }) => {
  const [balanceData, setBalanceData] = useState(null)
  const [userBalance, setUserBalance] = useState(null)
  const [optimized, setOptimized] = useState(null)
  const [optFailed, setOptFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchBalanceData = useCallback(async () => {
    setLoading(true)
    setOptFailed(false)
    try {
      const [groupBalances, userTotalBalance] = await Promise.all([
        groupId ? groupService.getGroupBalances(groupId) : null,
        expenseService.getUserBalance()
      ])

      if (groupBalances) {
        setBalanceData(groupBalances)
      }

      setUserBalance(userTotalBalance)

      if (groupId) {
        try {
          const opt = await groupService.getOptimizedSettlements(groupId)
          setOptimized(opt)
        } catch (e) {
          console.error('Optimized settlements failed:', e)
          setOptimized(null)
          setOptFailed(true)
        }
      } else {
        setOptimized(null)
      }
    } catch (error) {
      console.error('Error fetching balance data:', error)
      toast.error('Failed to load balance data')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchBalanceData()
  }, [fetchBalanceData])

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600'
    if (balance < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getBalanceBackground = (balance) => {
    if (balance > 0) return 'bg-green-50 border-green-200'
    if (balance < 0) return 'bg-red-50 border-red-200'
    return 'bg-gray-50 border-gray-200'
  }

  const getBalanceIcon = (balance) => {
    if (balance > 0) return <ArrowUpRight className="w-5 h-5" />
    if (balance < 0) return <ArrowDownLeft className="w-5 h-5" />
    return <DollarSign className="w-5 h-5" />
  }

  const getBalanceLabel = (balance) => {
    if (balance > 0) return 'You are owed'
    if (balance < 0) return 'You owe'
    return 'Settled up'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // User's overall balance across all groups
  const overallBalance = userBalance?.netBalance || 0

  return (
    <div className="space-y-6">
      {/* Overall Balance Card */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Overall Balance</h3>
              <p className="text-sm text-neutral-600">Across all groups</p>
            </div>
            <div className={`p-3 rounded-full ${getBalanceBackground(overallBalance)}`}>
              <div className={getBalanceColor(overallBalance)}>
                {getBalanceIcon(overallBalance)}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600">
                {getBalanceLabel(overallBalance)}
              </span>
              <span className={`text-2xl font-bold ${getBalanceColor(overallBalance)}`}>
                {formatCurrency(Math.abs(overallBalance))}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200">
              <div>
                <p className="text-xs text-neutral-600 mb-1">Total to receive</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(userBalance?.totalToReceive || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-600 mb-1">Total you owe</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(userBalance?.totalOwed || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group-specific balances */}
      {balanceData && balanceData.balances && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Group Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {balanceData.balances
              .filter(balance => balance.userId === userId || balance.email === userBalance?.email)
              .map((balance, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${getBalanceBackground(balance.netBalance)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getBalanceBackground(balance.netBalance)}`}>
                        <div className={getBalanceColor(balance.netBalance)}>
                          {getBalanceIcon(balance.netBalance)}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {balance.name || 'You'}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {getBalanceLabel(balance.netBalance)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getBalanceColor(balance.netBalance)}`}>
                        {formatCurrency(Math.abs(balance.netBalance))}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Paid: {formatCurrency(balance.totalPaid)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Settlement Suggestions */}
      {balanceData?.debts && balanceData.debts.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Settlement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {balanceData.debts.map((debt, index) => {
              const youOwe = partyIsUser(debt.from, userId, userBalance?.email)
              const youOwed = partyIsUser(debt.to, userId, userBalance?.email)
              const isIncoming = youOwed && !youOwe

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    isIncoming
                      ? 'bg-green-50 border-green-200'
                      : youOwe
                        ? 'bg-red-50 border-red-200'
                        : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isIncoming
                          ? 'bg-green-100 text-green-600'
                          : youOwe
                            ? 'bg-red-100 text-red-600'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {isIncoming ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {youOwe && `You owe ${debt.to.name}`}
                          {youOwed && !youOwe && `${debt.from.name} owes you`}
                          {!youOwe && !youOwed && `${debt.from.name} → ${debt.to.name}`}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {isIncoming ? 'Incoming payment' : youOwe ? 'Outgoing payment' : 'Group transfer'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isIncoming ? 'text-green-600' : youOwe ? 'text-red-600' : 'text-neutral-800'
                      }`}>
                        {formatCurrency(debt.amount)}
                      </p>
                      {(youOwe || youOwed) && (
                        <Button
                          size="sm"
                          variant={isIncoming ? 'secondary' : 'primary'}
                          onClick={() => onSettleClick?.(debt)}
                          className="mt-1"
                        >
                          {isIncoming ? 'Mark Received' : 'Settle Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Optimized settlements (Python / NetworkX) */}
      {groupId && optFailed && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Could not load optimized settlement suggestions. Check that the analytics service is running.
        </p>
      )}
      {groupId && optimized && (optimized.transactions?.length > 0 || optimized.transaction_count === 0) && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal-600" />
              Optimized settlement suggestions
            </CardTitle>
            <p className="text-sm text-neutral-600 mt-1">
              Minimum transfers to clear all balances in this group (same net result as simplified debts, fewer payments when possible).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {optimized.transaction_count === 0 && (
              <p className="text-sm text-neutral-600">No payments needed — balances net to zero.</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-neutral-700">
              <span className="rounded-lg bg-neutral-100 px-3 py-1 font-medium">
                {optimized.transaction_count} payment{optimized.transaction_count === 1 ? '' : 's'}
              </span>
              {typeof optimized.legacyPairwiseCount === 'number' && (
                <span className="rounded-lg bg-neutral-100 px-3 py-1">
                  vs {optimized.legacyPairwiseCount} simplified pairwise
                </span>
              )}
              {typeof optimized.transactions_saved_vs_legacy === 'number' && optimized.transactions_saved_vs_legacy > 0 && (
                <span className="rounded-lg bg-teal-100 text-teal-900 px-3 py-1 font-medium">
                  Saves {optimized.transactions_saved_vs_legacy} transfer{optimized.transactions_saved_vs_legacy === 1 ? '' : 's'}
                </span>
              )}
              {typeof optimized.transactions_saved_vs_bipartite === 'number' && optimized.transactions_saved_vs_bipartite > 0 && (
                <span className="rounded-lg bg-emerald-50 text-emerald-900 px-3 py-1 text-xs">
                  vs naive all-debtor→all-creditor: −{optimized.transactions_saved_vs_bipartite}
                </span>
              )}
            </div>
            {(optimized.transactions || []).map((row, index) => {
              const youOwe = partyIsUser(row.from, userId, userBalance?.email)
              const youOwed = partyIsUser(row.to, userId, userBalance?.email)
              const isIncoming = youOwed && !youOwe
              const debtShim = {
                from: row.from,
                to: row.to,
                amount: row.amount
              }
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    isIncoming
                      ? 'bg-green-50 border-green-200'
                      : youOwe
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {row.from.name} pays {row.to.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {youOwe && 'You are paying'}
                        {youOwed && !youOwe && 'You receive'}
                        {!youOwe && !youOwed && 'Suggested group payment'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-neutral-900">{formatCurrency(row.amount)}</p>
                      {(youOwe || youOwed) && (
                        <Button size="sm" variant={isIncoming ? 'secondary' : 'primary'} className="mt-1" onClick={() => onSettleClick?.(debtShim)}>
                          {isIncoming ? 'Mark Received' : 'Settle Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {balanceData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 mb-1">
                {balanceData.totalExpenses}
              </div>
              <p className="text-sm text-neutral-600">Total Expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 mb-1">
                {balanceData.totalSettlements}
              </div>
              <p className="text-sm text-neutral-600">Settlements</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900 mb-1">
                {balanceData.debts?.length || 0}
              </div>
              <p className="text-sm text-neutral-600">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default BalanceSummary
