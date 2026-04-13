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
      const settlements = await Settlement.find({ groupId, status: 'confirmed' })
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')

      // Initialize balances for all members
      const balances = new Map()

      // Process expenses
      expenses.forEach(expense => {
        const paidByKey = expense.paidBy?._id?.toString() || expense.paidBy
        const payerBalance = balances.get(paidByKey) || {
          userId: expense.paidBy,
          email: expense.paidBy?.email,
          name: expense.paidBy?.name || expense.paidBy?.email,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
          isTemporary: !expense.paidBy?._id
        }

        if (payerBalance) {
          payerBalance.totalPaid += expense.amount || 0
          balances.set(paidByKey, payerBalance)
        }

        // Process splits
        const splits = expense.splits || []
        splits.forEach(split => {
          const splitKey = split.userId?._id?.toString() || split.email
          if (!splitKey) return
          
          const splitBalance = balances.get(splitKey) || {
            userId: split.userId,
            email: split.email,
            name: split.name || split.email,
            totalPaid: 0,
            totalOwed: 0,
            netBalance: 0,
            isTemporary: !split.userId
          }
          
          if (splitBalance) {
            splitBalance.totalOwed += split.amount || 0
            balances.set(splitKey, splitBalance)
          }
        })
      })

      // Calculate net balances
      balances.forEach(balance => {
        balance.netBalance = subtractCurrency(balance.totalPaid, balance.totalOwed)
      })

      // Apply confirmed settlements after base net balances are calculated.
      settlements.forEach(settlement => {
        const fromKey = settlement.fromUser?._id?.toString() || settlement.fromUser?.toString()
        const toKey = settlement.toUser?._id?.toString() || settlement.toUser?.toString()

        if (fromKey) {
          const fromBalance = balances.get(fromKey)
          if (fromBalance) {
            fromBalance.netBalance = addCurrency(fromBalance.netBalance, settlement.amount || 0)
            balances.set(fromKey, fromBalance)
          }
        }

        if (toKey) {
          const toBalance = balances.get(toKey)
          if (toBalance) {
            toBalance.netBalance = subtractCurrency(toBalance.netBalance, settlement.amount || 0)
            balances.set(toKey, toBalance)
          }
        }
      })

      // Simplify debts
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
      throw new Error(`Failed to calculate group balances: ${error.message}`)
    }
  }

  /**
   * Simplify debts using greedy algorithm
   * @param {Array} balancesArray - Array of user balances
   * @returns {Array} Simplified debts
   */
  static simplifyDebts(balancesArray) {
    const debtors = balancesArray
      .filter(balance => balance.netBalance < 0)
      .map(balance => ({
        ...balance,
        netBalance: Math.abs(balance.netBalance)
      }))
      .sort((a, b) => b.netBalance - a.netBalance)

    const creditors = balancesArray
      .filter(balance => balance.netBalance > 0)
      .map(balance => ({
        ...balance,
        netBalance: balance.netBalance
      }))
      .sort((a, b) => b.netBalance - a.netBalance)

    const debts = []
    let i = 0, j = 0

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]
      const amount = Math.min(debtor.netBalance, creditor.netBalance)
      
      if (amount > 0.01) { // Only include significant amounts
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
          amount: Math.round(amount * 100) / 100
        })
      }
      
      debtor.netBalance -= amount
      creditor.netBalance -= amount
      
      if (Math.abs(debtor.netBalance) < 0.01) i++
      if (Math.abs(creditor.netBalance) < 0.01) j++
    }

    return debts
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
        // Calculate base amount and remainder
        const baseAmount = Math.floor(amount / splits.length * 100) / 100
        const remainder = Math.round((amount - (baseAmount * splits.length)) * 100) / 100
        
        // Distribute amounts with smart remainder handling
        splits.forEach((split, index) => {
          if (index === 0 && remainder > 0) {
            // First participant gets the remainder
            split.amount = roundToTwo(baseAmount + remainder)
          } else {
            split.amount = baseAmount
          }
          split.percentage = roundToTwo(divideCurrency(split.amount, amount) * 100)
          split.shares = 1
        })
        
        totalAmount = splits.reduce((sum, split) => addCurrency(sum, split.amount || 0), 0)
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

      default:
        errors.push('Invalid split type')
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    // Allow small rounding differences (up to 0.01) for all split types
    const difference = Math.abs(parseFloat(totalAmount) - parseFloat(amount))
    if (difference > 0.01) {
      errors.push('Total split amounts must equal expense amount')
    }

    return {
      isValid: true,
      groupId: expenseData.groupId,
      balances: new Map(),
      debts: [],
      totalExpenses: 0,
      totalSettlements: 0,
      lastUpdated: new Date(),
      processedSplits: splits
    }
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

      // Get all groups of user is a member of
      const groups = await Group.find({
        members: userId,
        isActive: true
      }).populate('members', 'name email')

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
}

export default BalanceService
