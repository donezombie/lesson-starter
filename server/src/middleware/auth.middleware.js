const { getUsername } = require('../store/tokenStore');

// Verifies the "Authorization: Bearer <token>" header against the
// in-memory token store and attaches req.user + req.token when valid.
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

  req.user = { username };
  req.token = token;
  next();
}

module.exports = requireAuth;
