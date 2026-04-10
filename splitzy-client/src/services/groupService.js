import { api } from '../lib/api.js'

export const groupService = {
  getGroups: async (params = {}) => {
    const res = await api.get('/groups', { params })
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
  },
  getGroupBalances: async (id) => {
    const res = await api.get(`/groups/${id}/balances`)
    return res.data
  },
  generateInviteLink: async (id, expiresInHours = 24) => {
    const res = await api.post(`/groups/${id}/invite`, { expiresInHours })
    return res.data
  },
  validateInvite: async (token) => {
    const res = await api.get(`/groups/invite/${token}`)
    return res.data
  },
  joinGroup: async (token) => {
    const res = await api.post(`/groups/join/${token}`)
    return res.data
  },
  removeMember: async (groupId, memberId) => {
    const res = await api.delete(`/groups/${groupId}/members/${memberId}`)
    return res.data
  },
  updateMemberRole: async (groupId, memberId, role) => {
    const res = await api.put(`/groups/${groupId}/members/${memberId}/role`, { role })
    return res.data
  }
}
