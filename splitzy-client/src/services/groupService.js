import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const groupService = {
  getGroups: async () => {
    const res = await api.get('/groups')
    return res.data
  },
  createGroup: async (data) => {
    const res = await api.post('/groups', data)
    return res.data
  },
  updateGroup: async (id, data) => {
    const res = await api.put(`/groups/${id}`, data)
    return res.data
  },
  deleteGroup: async (id) => {
    const res = await api.delete(`/groups/${id}`)
    return res.data
  }
}
