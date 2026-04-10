export const requireRole = (role) => (req, res, next) => {
  try {
    const userRole = req.user?.role
    if (!userRole) return res.status(403).json({ message: 'Forbidden' })
    if (userRole !== role) return res.status(403).json({ message: 'Insufficient role' })
    return next()
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden' })
  }
}

export const hasAnyRole = (...roles) => (req, res, next) => {
  try {
    const userRole = req.user?.role
    if (!userRole) return res.status(403).json({ message: 'Forbidden' })
    if (!roles.includes(userRole)) return res.status(403).json({ message: 'Insufficient role' })
    return next()
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden' })
  }
}
