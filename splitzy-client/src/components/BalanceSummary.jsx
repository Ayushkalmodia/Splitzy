import React, { useState, useEffect, useCallback } from 'react'
import { ArrowDownLeft, ArrowUpRight, Users, DollarSign, TrendingUp, TrendingDown, CheckCircle, Clock } from 'lucide-react'
import { groupService } from '../services/groupService'
import { expenseService } from '../services/expenseService'
import { formatCurrency } from '../utils/currency.js'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card.jsx'
import Button from './ui/Button.jsx'
import toast from 'react-hot-toast'

const BalanceSummary = ({ groupId, userId, onSettleClick }) => {
  const [balanceData, setBalanceData] = useState(null)
  const [userBalance, setUserBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBalanceData()
  }, [fetchBalanceData])

  const fetchBalanceData = useCallback(async () => {
    setLoading(true)
    try {
      const [groupBalances, userTotalBalance] = await Promise.all([
        groupId ? groupService.getGroupBalances(groupId) : null,
        expenseService.getUserBalance()
      ])
      
      if (groupBalances) {
        setBalanceData(groupBalances)
      }
      
      setUserBalance(userTotalBalance)
    } catch (error) {
      console.error('Error fetching balance data:', error)
      toast.error('Failed to load balance data')
    } finally {
      setLoading(false)
    }
  }, [groupId])

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
              const isIncoming = debt.from.userId === userId || debt.from.email === userBalance?.email
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    isIncoming 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isIncoming 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {isIncoming ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {isIncoming 
                            ? `${debt.from.name} owes you`
                            : `You owe ${debt.to.name}`
                          }
                        </p>
                        <p className="text-sm text-neutral-600">
                          {isIncoming ? 'Incoming payment' : 'Outgoing payment'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isIncoming ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(debt.amount)}
                      </p>
                      <Button
                        size="sm"
                        variant={isIncoming ? "secondary" : "primary"}
                        onClick={() => onSettleClick?.(debt)}
                        className="mt-1"
                      >
                        {isIncoming ? 'Mark Received' : 'Settle Now'}
                      </Button>
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
