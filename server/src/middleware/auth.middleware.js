const { getUsername } = require('../store/tokenStore');
const { findByUsername, toPublicProfile } = require('../data/employees');

// Verifies the "Authorization: Bearer <token>" header against the
// in-memory token store, then looks up the employee record so req.user
// carries the full profile (including role) rather than just a username.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  const username = getUsername(token);
  if (!username) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const employee = findByUsername(username);
  if (!employee) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = toPublicProfile(employee);
  req.token = token;
  next();
}

module.exports = requireAuth;
