import apiClient from '../lib/api.js'

export const authService = {
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout', {}, { withCredentials: true })
    } catch {
      // still clear client state
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getOAuthStatus: async () => {
    const response = await apiClient.get('/auth/oauth/status')
    return response.data
  },

  refreshSession: async () => {
    const response = await apiClient.post('/auth/refresh', {}, { withCredentials: true })
    return response.data
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user')
    if (!user) {
      return null
    }
    try {
      return JSON.parse(user)
    } catch {
      localStorage.removeItem('user')
      return null
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },

  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}
