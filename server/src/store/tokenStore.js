const crypto = require('crypto');

// In-memory session store: token -> username.
// Resets whenever the server restarts (fine for a study/demo project).
const tokens = new Map();

function createToken(username) {
  const token = crypto.randomUUID();
  tokens.set(token, username);
  return token;
}

function getUsername(token) {
  return tokens.get(token);
}

function revokeToken(token) {
  return tokens.delete(token);
}

module.exports = { createToken, getUsername, revokeToken };
