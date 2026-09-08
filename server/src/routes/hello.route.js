const express = require('express');

const requireAuth = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/hello:
 *   get:
 *     summary: Return a hello world greeting
 *     tags: [Hello]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello, world!
 *       401:
 *         description: Missing, invalid or expired token
 */
router.get('/hello', requireAuth, (req, res) => {
  res.json({ message: 'Hello, world!' });
});

module.exports = router;
