const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const { checkIn, checkOut, listAttendance } = require('../data/attendance');

const router = express.Router();

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Check in for today (for the current user)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Attendance record created
 *       400:
 *         description: Already checked in
 */
router.post('/attendance/check-in', requireAuth, async (req, res) => {
  try {
    const record = await checkIn(req.user.id);
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Check out of the current open attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance record updated
 *       400:
 *         description: No open check-in found
 */
router.post('/attendance/check-out', requireAuth, async (req, res) => {
  try {
    const record = await checkOut(req.user.id);
    res.json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: List attendance records (self for employees, all/filterable for admins)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *         description: Admin only — filter by employee
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get('/attendance', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    const { employeeId } = req.query;
    return res.json(await listAttendance({ employeeId }));
  }

  res.json(await listAttendance({ employeeId: req.user.id }));
});

module.exports = router;
