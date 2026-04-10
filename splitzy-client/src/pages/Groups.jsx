import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Users, UserPlus, Trash2, Edit2, Settings, DollarSign, Calendar } from 'lucide-react'
import { groupService } from '../services/groupService'
import GroupManagement from '../components/GroupManagement.jsx'
import BalanceSummary from '../components/BalanceSummary.jsx'
import SettlementModal from '../components/SettlementModal.jsx'

const Groups = () => {
  const [groups, setGroups] = useState([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showManagement, setShowManagement] = useState(false)
  const [showSettlements, setShowSettlements] = useState(false)
  const [showBalances, setShowBalances] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: []
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const data = await groupService.getGroups()
      // Handle various API response formats defensively
      const groupsArray = data?.items || data || []
      setGroups(Array.isArray(groupsArray) ? groupsArray : [])
    } catch (error) {
      toast.error('Failed to fetch groups')
      console.error('Error fetching groups:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        members: formData.members.filter(m => m.email?.trim())
      }
      
      if (editingGroup?._id) {
        const updated = await groupService.updateGroup(editingGroup._id, payload)
        setGroups(groups.map((g) => (g._id === editingGroup._id ? updated : g)))
        toast.success('Group updated successfully')
      } else {
        const created = await groupService.createGroup(payload)
        setGroups([created, ...groups])
        toast.success('Group created successfully')
      }
      
      resetForm()
      setShowGroupForm(false)
      setEditingGroup(null)
    } catch (error) {
      toast.error(error.message || 'Failed to save group')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      members: []
    })
  }

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }
    
    try {
      await groupService.deleteGroup(groupId)
      setGroups(groups.filter(g => g._id !== groupId))
      toast.success('Group deleted successfully')
    } catch (error) {
      toast.error('Failed to delete group')
    }
  }

  const openGroupManagement = (group) => {
    setSelectedGroup(group)
    setShowManagement(true)
  }

  const openSettlements = (group) => {
    setSelectedGroup(group)
    setShowSettlements(true)
  }

  const openBalances = (group) => {
    setSelectedGroup(group)
    setShowBalances(true)
  }

  const onGroupUpdated = () => {
    fetchGroups()
  }

  const onSettlementCreated = () => {
    // Refresh group data to recalculate balances
    fetchGroups()
  }

  const addMemberField = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', email: '', role: 'member' }]
    }))
  }

  const updateMemberField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }))
  }

  const removeMemberField = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
          <button
            onClick={() => {
              resetForm()
              setEditingGroup(null)
              setShowGroupForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h2>
            <p className="text-gray-500 mb-6">Create your first group to start splitting expenses</p>
            <button
              onClick={() => setShowGroupForm(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openGroupManagement(group)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Manage Group"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group._id)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{group.members?.length || 0} members</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openBalances(group)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      >
                        <DollarSign className="w-4 h-4" />
                        Balances
                      </button>
                      <button
                        onClick={() => openSettlements(group)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
                      >
                        <Users className="w-4 h-4" />
                        Settle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Form Modal */}
        {showGroupForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b px-6 py-4">
                <h2 className="text-xl font-semibold">
                  {editingGroup ? 'Edit Group' : 'Create New Group'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Roommates, Trip to Paris"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="What's this group for?"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Members (optional)
                    </label>
                    <button
                      type="button"
                      onClick={addMemberField}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + Add Member
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.members.map((member, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMemberField(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Name"
                        />
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMemberField(index, 'email', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Email (optional)"
                        />
                        <button
                          type="button"
                          onClick={() => removeMemberField(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupForm(false)
                      resetForm()
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Group Management Modal */}
        {showManagement && selectedGroup && (
          <GroupManagement
            group={selectedGroup}
            onClose={() => setShowManagement(false)}
            onGroupUpdated={onGroupUpdated}
          />
        )}

        {/* Settlement Modal */}
        {showSettlements && selectedGroup && (
          <SettlementModal
            isOpen={showSettlements}
            onClose={() => setShowSettlements(false)}
            groupId={selectedGroup._id}
            groupMembers={selectedGroup.members || []}
            onSettlementCreated={onSettlementCreated}
          />
        )}

        {/* Balance Summary Modal */}
        {showBalances && selectedGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Balance Summary</h2>
                <button
                  onClick={() => setShowBalances(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <BalanceSummary groupId={selectedGroup._id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Groups 