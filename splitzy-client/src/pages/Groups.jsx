import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Plus, Users, UserPlus, Trash2, Edit2 } from 'lucide-react'
import { groupService } from '../services/groupService'
import { authService } from '../services/authService'

const Groups = () => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    members: ['']
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const data = await groupService.getGroups()
      setGroups(data)
    } catch (error) {
      toast.error('Failed to fetch groups')
      console.error('Error fetching groups:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const me = authService.getCurrentUser()
      const payload = {
        name: formData.name,
        members: Array.from(
          new Set([
            ...formData.members.filter((m) => m.trim() !== ''),
            me?.email || ''
          ].filter(Boolean))
        )
      }
      if (editingGroup?._id) {
        const updated = await groupService.updateGroup(editingGroup._id, payload)
        setGroups(groups.map((g) => (g._id === editingGroup._id ? updated : g)))
        toast.success('Group updated successfully')
      } else {
        const created = await groupService.createGroup(payload)
        setGroups([...groups, created])
        toast.success('Group created successfully')
      }
      setShowGroupForm(false)
      setEditingGroup(null)
      setFormData({ name: '', members: [''] })
    } catch (error) {
      toast.error(editingGroup ? 'Failed to update group' : 'Failed to create group')
      console.error('Error handling group:', error)
    }
  }

  const handleDeleteGroup = async (groupId) => {
    try {
      await groupService.deleteGroup(groupId)
      setGroups(groups.filter((g) => g._id !== groupId))
      toast.success('Group deleted successfully')
    } catch (error) {
      toast.error('Failed to delete group')
      console.error('Error deleting group:', error)
    }
  }

  const handleEditGroup = (group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      members: [...group.members, '']
    })
    setShowGroupForm(true)
  }

  const addMemberField = () => {
    setFormData({
      ...formData,
      members: [...formData.members, '']
    })
  }

  const removeMemberField = (index) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    })
  }

  const updateMember = (index, value) => {
    const newMembers = [...formData.members]
    newMembers[index] = value
    setFormData({
      ...formData,
      members: newMembers
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Groups</h1>
            <p className="text-neutral-600">Manage your expense groups</p>
          </div>
          <button
            onClick={() => {
              const me = authService.getCurrentUser()
              setFormData({ name: '', members: [me?.email || '', ''] })
              setEditingGroup(null)
              setShowGroupForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Create Group
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group._id}
              className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 hover:border-teal-100 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900">{group.name}</h3>
                  <p className="text-sm text-neutral-600">Created on {new Date(group.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="p-2 text-neutral-600 hover:text-teal-600 transition-colors"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group._id)}
                    className="p-2 text-neutral-600 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Members:</span>
                </div>
                <ul className="space-y-1">
                  {group.members.map((member, index) => (
                    <li key={index} className="text-sm text-neutral-600">
                      • {member === (authService.getCurrentUser()?.email) ? (authService.getCurrentUser()?.name || member) : member}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Group Form Modal */}
        {showGroupForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-auto">
              <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </h2>
                <button
                  onClick={() => {
                    setShowGroupForm(false)
                    setEditingGroup(null)
                    setFormData({ name: '', members: [''] })
                  }}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Group Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter group name"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">Members</label>
                  {formData.members.map((member, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={member}
                        onChange={(e) => updateMember(index, e.target.value)}
                        placeholder="Enter member name"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all outline-none"
                        required
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeMemberField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMemberField}
                    className="flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Member
                  </button>
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Groups 