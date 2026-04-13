import User from '../models/User.js'

export const searchUsers = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) {
      return res.json([])
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'i')

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } },
        { username: { $regex: regex } }
      ]
    })
      .select('_id name email username')
      .sort({ name: 1 })
      .limit(10)

    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Failed to search users' })
  }
}
