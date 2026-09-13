const express = require('express');

const { findUser } = require('../data/employees');
const { createToken, revokeToken } = require('../store/tokenStore');
const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in with username/password and receive a bearer token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful, returns a bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid username or password
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  const user = await findUser(username, password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = createToken(user.username);
  res.json({ token });
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Log out and invalidate the current bearer token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Missing, invalid or expired token
 */
router.post('/logout', requireAuth, (req, res) => {
  revokeToken(req.token);
  res.json({ message: 'Logged out' });
});

module.exports = router;
