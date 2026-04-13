import React, { useEffect, useState } from 'react'
import { Users, Mail, Settings, UserMinus, Copy, Plus, X, Search } from 'lucide-react'
import { groupService } from '../services/groupService'
import { userService } from '../services/userService'
import toast from 'react-hot-toast'

const GroupManagement = ({ group, onClose, onGroupUpdated }) => {
  const [inviteData, setInviteData] = useState({ token: '', expiry: null, inviteLink: '' })
  const [inviteCode, setInviteCode] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)

  useEffect(() => {
    const runSearch = async () => {
      const query = searchQuery.trim()
      if (!showAddMemberModal || !query) {
        setSearchResults([])
        return
      }

      try {
        const results = await userService.searchUsers(query)
        const existing = new Set((group.members || []).map((member) => member._id))
        setSearchResults(results.filter((result) => !existing.has(result._id)))
      } catch {
        setSearchResults([])
      }
    }
    runSearch()
  }, [searchQuery, showAddMemberModal, group.members])

  const generateInviteLink = async () => {
    setIsGeneratingInvite(true)
    try {
      const data = await groupService.generateInviteLink(group._id, 24)
      setInviteData(data)
      setShowInviteModal(true)
      toast.success('Invite link generated successfully')
    } catch (error) {
      toast.error('Failed to generate invite link')
    } finally {
      setIsGeneratingInvite(false)
    }
  }

  const generateCode = async () => {
    try {
      const data = await groupService.generateInviteCode(group._id)
      setInviteCode(data.inviteCode || '')
      toast.success('Invite code generated')
    } catch (error) {
      toast.error(error?.message || 'Failed to generate invite code')
    }
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteData.inviteLink)
    toast.success('Invite link copied to clipboard')
  }

  const addMember = async (member) => {
    if (!member?._id) {
      toast.error('Please select a valid user')
      return
    }

    setIsAddingMember(true)
    try {
      const existing = (group.members || []).map((m) => m._id)
      await groupService.updateGroup(group._id, { members: [...existing, member._id] })
      toast.success('Member added successfully')
      setShowAddMemberModal(false)
      setSearchQuery('')
      setSearchResults([])
      onGroupUpdated && onGroupUpdated()
    } catch (error) {
      console.error('Add member error:', error)
      toast.error(error.message || 'Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const removeMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      await groupService.removeMember(group._id, memberId)
      toast.success('Member removed successfully')
      onGroupUpdated && onGroupUpdated()
    } catch (error) {
      toast.error(error.message || 'Failed to remove member')
    }
  }

  const isOwner = (member) => {
    return group.createdBy?._id === member._id
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Group Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Group Info */}
          <div>
            <h3 className="text-lg font-medium mb-3">{group.name}</h3>
            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateInviteLink}
              disabled={isGeneratingInvite}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {isGeneratingInvite ? 'Generating...' : 'Generate Invite Link'}
            </button>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
            <button
              onClick={generateCode}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Generate Invite Code
            </button>
          </div>

          {inviteCode && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm">
              <span className="text-gray-700 mr-2">Invite code:</span>
              <span className="font-mono font-semibold text-purple-700">{inviteCode}</span>
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members ({group.members?.length || 0})
            </h3>
            
            <div className="space-y-2">
              {group.members?.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.name?.[0] || member.email?.[0] || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.name || member.email || 'Unknown'}
                        </span>
                        {isOwner(member) && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Creator
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <div className="text-sm text-gray-500">{member.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isOwner(member) && (
                      <button
                        onClick={() => removeMember(member._id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Link Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Invite Link Generated</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share this link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteData.inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {inviteData.expiry && (
                <div className="text-sm text-gray-600">
                  <strong>Expires:</strong> {new Date(inviteData.expiry).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Member</h3>
            
            <div className="space-y-3">
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full outline-none text-sm"
                  placeholder="Search by name or email"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg">
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                )}
                {searchResults.map((result) => (
                  <button
                    key={result._id}
                    type="button"
                    onClick={() => addMember(result)}
                    disabled={isAddingMember}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <div className="text-sm font-medium text-gray-900">{result.name}</div>
                    <div className="text-xs text-gray-500">{result.email}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupManagement
