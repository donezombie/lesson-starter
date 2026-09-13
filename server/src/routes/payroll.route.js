const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const { getSettings, updateSettings } = require('../data/settings');
const {
  getSummary,
  generatePayroll,
  updatePayrollAdjustment,
  listPayroll,
} = require('../data/payroll');

const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get company-wide settings (standard work days)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current settings
 */
router.get('/settings', requireAuth, async (req, res) => {
  res.json(await getSettings());
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update the standard work days (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [standardWorkDays]
 *             properties:
 *               standardWorkDays: { type: integer }
 *     responses:
 *       200:
 *         description: Updated settings
 *       400:
 *         description: Invalid value
 *       403:
 *         description: Caller is not an admin
 */
router.put('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const settings = await updateSettings(req.body || {});
    res.json(settings);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payroll/summary:
 *   get:
 *     summary: Live per-employee work-day/pay summary for a month (admin only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, example: "2026-09" }
 *     responses:
 *       200:
 *         description: Summary list
 *       400:
 *         description: Missing month
 *       403:
 *         description: Caller is not an admin
 */
router.get('/payroll/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: 'month is required' });
  }

  res.json(await getSummary(month));
});

/**
 * @swagger
 * /api/payroll:
 *   get:
 *     summary: List payroll records (self for employees, all/filterable for admins)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of payroll records
 */
router.get('/payroll', requireAuth, async (req, res) => {
  const { month, employeeId } = req.query;

  if (req.user.role === 'admin') {
    return res.json(await listPayroll({ month, employeeId }));
  }

  res.json(await listPayroll({ month, employeeId: req.user.id }));
});

/**
 * @swagger
 * /api/payroll/generate:
 *   post:
 *     summary: Generate (or overwrite) a payroll record for an employee/month (admin only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, month]
 *             properties:
 *               employeeId: { type: integer }
 *               month: { type: string, example: "2026-09" }
 *               adjustment: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Payroll record created/updated
 *       400:
 *         description: Missing fields or employee not found
 *       403:
 *         description: Caller is not an admin
 */
router.post('/payroll/generate', requireAuth, requireRole('admin'), async (req, res) => {
  const { employeeId, month, adjustment, note } = req.body || {};
  if (!employeeId || !month) {
    return res
      .status(400)
      .json({ message: 'employeeId and month are required' });
  }

  try {
    const record = await generatePayroll(employeeId, month, { adjustment, note });
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payroll/{id}:
 *   patch:
 *     summary: Edit the adjustment/note of an existing payroll record (admin only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adjustment: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Updated payroll record
 *       404:
 *         description: Payroll record not found
 *       403:
 *         description: Caller is not an admin
 */
router.patch('/payroll/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const record = await updatePayrollAdjustment(req.params.id, req.body || {});
  if (!record) {
    return res.status(404).json({ message: 'Payroll record not found' });
  }

  res.json(record);
});

module.exports = router;
