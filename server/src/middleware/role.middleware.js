// Use after requireAuth. Rejects with 403 unless req.user.role matches.
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = requireRole;
