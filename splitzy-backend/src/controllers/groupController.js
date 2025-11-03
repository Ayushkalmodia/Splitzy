import Group from '../models/Group.js'

export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.user.id }).sort({ createdAt: -1 })
    res.json(groups)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const createGroup = async (req, res) => {
  const { name, members } = req.body
  if (!name) return res.status(400).json({ message: 'Name is required' })
  try {
    const inputMembers = Array.isArray(members) ? members : []
    const normalized = inputMembers
      .map((m) => String(m).trim())
      .filter((m) => m.length > 0)
    // Ensure current user is a member (use email identity)
    if (!normalized.includes(req.user.email)) normalized.push(req.user.email)
    // Dedupe
    const uniqueMembers = [...new Set(normalized)]

    const group = await Group.create({ name, members: uniqueMembers, owner: req.user.id })
    res.status(201).json(group)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const updateGroup = async (req, res) => {
  const { id } = req.params
  const { name, members } = req.body
  try {
    const inputMembers = Array.isArray(members) ? members : []
    const normalized = inputMembers
      .map((m) => String(m).trim())
      .filter((m) => m.length > 0)
    if (!normalized.includes(req.user.email)) normalized.push(req.user.email)
    const uniqueMembers = [...new Set(normalized)]

    const group = await Group.findOneAndUpdate(
      { _id: id, owner: req.user.id },
      { $set: { name, members: uniqueMembers } },
      { new: true }
    )
    if (!group) return res.status(404).json({ message: 'Group not found' })
    res.json(group)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

export const deleteGroup = async (req, res) => {
  const { id } = req.params
  try {
    const group = await Group.findOneAndDelete({ _id: id, owner: req.user.id })
    if (!group) return res.status(404).json({ message: 'Group not found' })
    res.json({ message: 'Group deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
