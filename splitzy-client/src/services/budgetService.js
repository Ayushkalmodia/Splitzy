import { api } from '../lib/api.js'

export const budgetService = {
  list: async () => {
    const res = await api.get('/budgets')
    return res.data
  },
  getStatus: async (month) => {
    const res = await api.get('/budgets/status', { params: { month } })
    return res.data
  },
  create: async (data) => {
    const res = await api.post('/budgets', data)
    return res.data
  },
  update: async (id, data) => {
    const res = await api.put(`/budgets/${id}`, data)
    return res.data
  },
  remove: async (id) => {
    const res = await api.delete(`/budgets/${id}`)
    return res.data
  }
}
