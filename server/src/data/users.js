// Hardcoded demo user for login/logout flow. Do not use in production.
const users = [
  {
    id: 1,
    username: 'admin',
    password: '123456',
    fullName: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  },
];

function findUser(username, password) {
  return users.find(
    (u) => u.username === username && u.password === password
  );
}

function findByUsername(username) {
  return users.find((u) => u.username === username);
}

// Returns the user without the password field, safe to send back to clients.
function toPublicProfile(user) {
  const { password, ...publicProfile } = user;
  return publicProfile;
}

module.exports = { findUser, findByUsername, toPublicProfile };
