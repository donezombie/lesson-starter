const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../data/employees');

const router = express.Router();

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: List all employees (admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *       403:
 *         description: Caller is not an admin
 */
router.get('/employees', requireAuth, requireRole('admin'), async (req, res) => {
  res.json(await listEmployees());
});

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create a new employee (admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, fullName, email]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               position: { type: string }
 *               department: { type: string }
 *               role: { type: string, enum: [admin, employee] }
 *               joinDate: { type: string }
 *     responses:
 *       201:
 *         description: Employee created
 *       400:
 *         description: Missing required field or username already taken
 *       403:
 *         description: Caller is not an admin
 */
router.post('/employees', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, fullName, email } = req.body || {};
  if (!username || !password || !fullName || !email) {
    return res
      .status(400)
      .json({ message: 'username, password, fullName and email are required' });
  }

  try {
    const employee = await createEmployee(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update an employee's profile/role (admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Updated employee
 *       404:
 *         description: Employee not found
 *       403:
 *         description: Caller is not an admin
 */
router.put('/employees/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const employee = await updateEmployee(req.params.id, req.body || {});
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.json(employee);
});

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete an employee (admin only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Cannot delete your own account
 *       404:
 *         description: Employee not found
 *       403:
 *         description: Caller is not an admin
 */
router.delete('/employees/:id', requireAuth, requireRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const deleted = await deleteEmployee(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.status(204).end();
});

module.exports = router;
