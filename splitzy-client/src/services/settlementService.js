import { api } from '../lib/api.js'

export const settlementService = {
  // Get all settlements
  getSettlements: async (params = {}) => {
    try {
      const response = await api.get('/settlements', { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get settlements by group
  getSettlementsByGroup: async (groupId, params = {}) => {
    try {
      const response = await api.get(`/settlements/group/${groupId}`, { params })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Create new settlement
  createSettlement: async (settlementData) => {
    try {
      const response = await api.post('/settlements', settlementData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Update settlement
  updateSettlement: async (settlementId, settlementData) => {
    try {
      const response = await api.put(`/settlements/${settlementId}`, settlementData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Delete settlement
  deleteSettlement: async (settlementId) => {
    try {
      const response = await api.delete(`/settlements/${settlementId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Confirm settlement
  confirmSettlement: async (settlementId) => {
    try {
      const response = await api.post(`/settlements/${settlementId}/confirm`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Cancel settlement
  cancelSettlement: async (settlementId) => {
    try {
      const response = await api.post(`/settlements/${settlementId}/cancel`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get settlement suggestions
  getSettlementSuggestions: async (groupId) => {
    try {
      const response = await api.get(`/settlements/group/${groupId}/suggestions`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}
