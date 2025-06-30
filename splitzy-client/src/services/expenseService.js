import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const expenseService = {
  // Get all expenses
  getExpenses: async () => {
    try {
      const response = await api.get('/expenses')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get expenses by group
  getExpensesByGroup: async (groupId) => {
    try {
      const response = await api.get(`/expenses/group/${groupId}`)
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
  getExpenseStats: async () => {
    try {
      const response = await api.get('/expenses/stats')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
} 