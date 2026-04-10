import Expense from '../models/Expense.js'
import Settlement from '../models/Settlement.js'
import Group from '../models/Group.js'
import User from '../models/User.js'
import { 
  addCurrency, 
  subtractCurrency, 
  multiplyCurrency, 
  divideCurrency, 
  currencyEquals, 
  isZeroAmount, 
  isSignificantAmount,
  roundToTwo
} from '../utils/currency.js'

class BalanceService {
  /**
   * Calculate balances for a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Balance summary
   */
  static async calculateGroupBalances(groupId) {
    try {
      // Get all expenses for the group
      const expenses = await Expense.find({ groupId })
        .populate('paidBy', 'name email')
        .populate('splits.userId', 'name email')
        .sort({ createdAt: -1 })

      // Get all settlements for the group
      const settlements = await Settlement.find({ 
        groupId, 
        status: { $in: ['confirmed', 'pending'] } 
      })
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')
        .sort({ createdAt: -1 })

      // Calculate net balances from expenses
      const balances = new Map()
      
      // Initialize balances for all group members
      const group = await Group.findById(groupId).populate('members.userId', 'name email')
      group.members.forEach(member => {
        const key = member.userId ? member.userId._id.toString() : member.email
        balances.set(key, {
          userId: member.userId?._id,
          email: member.email || member.userId?.email,
          name: member.tempName || member.userId?.name,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
          isTemporary: member.isTemporary
        })
      })

      // Process expenses
      expenses.forEach(expense => {
        const paidByKey = expense.paidBy?._id?.toString()
        if (!paidByKey) return
        
        const payerBalance = balances.get(paidByKey)
        
        if (payerBalance) {
          payerBalance.totalPaid = addCurrency(payerBalance.totalPaid, expense.amount || 0)
        }

        // Process splits
        const splits = expense.splits || []
        splits.forEach(split => {
          const splitKey = split.userId ? split.userId._id?.toString() : split.email
          if (!splitKey) return
          
          const splitBalance = balances.get(splitKey)
          
          if (splitBalance) {
            splitBalance.totalOwed = addCurrency(splitBalance.totalOwed, split.amount || 0)
          }
        })
      })

      // Calculate net balances
      balances.forEach(balance => {
        balance.netBalance = subtractCurrency(balance.totalPaid, balance.totalOwed)
      })

      // Process settlements
      settlements.forEach(settlement => {
        const fromKey = settlement.fromUser?._id?.toString()
        const toKey = settlement.toUser?._id?.toString()
        
        if (!fromKey || !toKey) return
        
        const fromBalance = balances.get(fromKey)
        const toBalance = balances.get(toKey)
        
        if (fromBalance) {
          fromBalance.netBalance = addCurrency(fromBalance.netBalance, settlement.amount || 0)
        }
        if (toBalance) {
          toBalance.netBalance = subtractCurrency(toBalance.netBalance, settlement.amount || 0)
        }
      })

      // Generate simplified debt relationships
      const debts = this.simplifyDebts(Array.from(balances.values()))

      return {
        groupId,
        balances: Array.from(balances.values()),
        debts,
        totalExpenses: expenses.length,
        totalSettlements: settlements.length,
        lastUpdated: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to calculate balances: ${error.message}`)
    }
  }

  /**
   * Simplify debt relationships to minimize transactions
   * @param {Array} balances - Array of user balances
   * @returns {Array} Simplified debt relationships
   */
  static simplifyDebts(balances) {
    // Debtors: negative net balance (owe money)
    const debtors = balances.filter(b => b.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance)
    // Creditors: positive net balance (should receive money)  
    const creditors = balances.filter(b => b.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance)
    
    const debts = []
    let i = 0, j = 0

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]  // Person who owes money
      const creditor = creditors[j]  // Person who should receive money
      
      // Calculate minimum amount using decimal-safe operations
      const debtorOwed = multiplyCurrency(debtor.netBalance, -1) // Convert to positive
      const creditorOwed = creditor.netBalance
      const amount = debtorOwed < creditorOwed ? debtorOwed : creditorOwed
      
      if (isSignificantAmount(amount)) { // Only include significant amounts
        debts.push({
          from: {
            userId: debtor.userId,
            email: debtor.email,
            name: debtor.name,
            isTemporary: debtor.isTemporary
          },
          to: {
            userId: creditor.userId,
            email: creditor.email,
            name: creditor.name,
            isTemporary: creditor.isTemporary
          },
          amount: roundToTwo(amount)
        })
      }
      
      // Update balances using decimal-safe operations
      debtor.netBalance = addCurrency(debtor.netBalance, amount)
      creditor.netBalance = subtractCurrency(creditor.netBalance, amount)
      
      if (isZeroAmount(debtor.netBalance)) i++
      if (isZeroAmount(creditor.netBalance)) j++
    }

    return debts
  }

  /**
   * Get user's total balance across all groups
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's balance summary
   */
  static async getUserTotalBalance(userId) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Get all groups the user is a member of
      const groups = await Group.find({
        'members.userId': userId,
        isActive: true
      }).populate('members.userId', 'name email')

      let totalOwed = 0
      let totalToReceive = 0
      const groupBalances = []

      for (const group of groups) {
        const balanceData = await this.calculateGroupBalances(group._id)
        const userBalance = balanceData.balances.find(b => 
          b.userId && b.userId.toString() === userId
        )

        if (userBalance) {
          if (userBalance.netBalance < 0) {
            totalOwed = addCurrency(totalOwed, multiplyCurrency(userBalance.netBalance, -1))
          } else {
            totalToReceive = addCurrency(totalToReceive, userBalance.netBalance)
          }

          groupBalances.push({
            groupId: group._id,
            groupName: group.name,
            balance: userBalance.netBalance
          })
        }
      }

      return {
        userId,
        email: user.email,
        name: user.name,
        totalOwed: roundToTwo(totalOwed),
        totalToReceive: roundToTwo(totalToReceive),
        netBalance: roundToTwo(subtractCurrency(totalToReceive, totalOwed)),
        groupBalances
      }
    } catch (error) {
      throw new Error(`Failed to get user balance: ${error.message}`)
    }
  }

  /**
   * Validate expense splits
   * @param {Object} expenseData - Expense data
   * @returns {Object} Validation result
   */
  static validateExpenseSplits(expenseData) {
    const { amount, splitType, splits } = expenseData
    const errors = []

    if (!splits || splits.length === 0) {
      errors.push('At least one split is required')
      return { isValid: false, errors }
    }

    let totalAmount = 0

    switch (splitType) {
      case 'equal':
        const equalAmount = divideCurrency(amount, splits.length)
        splits.forEach(split => {
          split.amount = equalAmount
          split.percentage = divideCurrency(100, splits.length)
          split.shares = 1
        })
        totalAmount = multiplyCurrency(equalAmount, splits.length)
        break

      case 'unequal':
        totalAmount = splits.reduce((sum, split) => addCurrency(sum, split.amount || 0), 0)
        splits.forEach(split => {
          split.percentage = multiplyCurrency(divideCurrency(split.amount || 0, amount), 100)
        })
        break

      case 'percentage':
        const totalPercentage = splits.reduce((sum, split) => addCurrency(sum, split.percentage || 0), 0)
        if (!currencyEquals(totalPercentage, 100)) {
          errors.push('Percentages must sum to 100%')
        }
        splits.forEach(split => {
          split.amount = multiplyCurrency(divideCurrency(split.percentage || 0, 100), amount)
        })
        totalAmount = amount
        break

      case 'shares':
        const totalShares = splits.reduce((sum, split) => addCurrency(sum, split.shares || 0), 0)
        if (isZeroAmount(totalShares)) {
          errors.push('Total shares must be greater than 0')
        }
        splits.forEach(split => {
          split.amount = multiplyCurrency(divideCurrency(split.shares || 0, totalShares), amount)
          split.percentage = multiplyCurrency(divideCurrency(split.shares || 0, totalShares), 100)
        })
        totalAmount = amount
        break

      case 'manual':
        totalAmount = splits.reduce((sum, split) => addCurrency(sum, split.amount || 0), 0)
        break

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    return {
      isValid: true,
      groupId,
      balances: Array.from(balances.values()),
      debts,
      totalExpenses: expenses.length,
      totalSettlements: settlements.length,
      lastUpdated: new Date()
    }
  }
}

export default BalanceService
