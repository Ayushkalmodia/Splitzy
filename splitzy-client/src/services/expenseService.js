import { api } from '../lib/api.js'

export const expenseService = {
  // Get all expenses
  getExpenses: async (params = {}) => {
    try {
      const response = await api.get('/expenses', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get expenses by group
  getExpensesByGroup: async (groupId, params = {}) => {
    try {
      const response = await api.get(`/groups/${groupId}/expenses`, { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Create new expense
  createExpense: async (expenseData) => {
    try {
      const response = await api.post('/expenses', expenseData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Update expense
  updateExpense: async (expenseId, expenseData) => {
    try {
      const response = await api.put(`/expenses/${expenseId}`, expenseData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Delete expense
  deleteExpense: async (expenseId) => {
    try {
      const response = await api.delete(`/expenses/${expenseId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get expense statistics
  getExpenseStats: async (params = {}) => {
    try {
      const response = await api.get('/expenses/stats', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get user balance
  getUserBalance: async () => {
    try {
      const response = await api.get('/expenses/balance')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
} 