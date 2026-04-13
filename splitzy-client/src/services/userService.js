import { api } from '../lib/api.js'

export const userService = {
  searchUsers: async (query) => {
    const q = String(query || '').trim()
    if (!q) return []
    const res = await api.get('/users/search', { params: { q } })
    return Array.isArray(res.data) ? res.data : []
  }
}
