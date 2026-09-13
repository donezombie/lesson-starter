const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const { findByUsername, toPublicProfile } = require('../data/employees');

const router = express.Router();

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Currently authenticated user's profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: admin
 *                 fullName:
 *                   type: string
 *                   example: Admin User
 *                 email:
 *                   type: string
 *                   example: admin@example.com
 *                 role:
 *                   type: string
 *                   example: admin
 *       401:
 *         description: Missing, invalid or expired token
 *       404:
 *         description: User for the current token no longer exists
 */
router.get('/me', requireAuth, async (req, res) => {
  const user = await findByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(toPublicProfile(user));
});

module.exports = router;
