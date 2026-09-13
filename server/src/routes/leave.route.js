const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  createLeaveRequest,
  listLeaveRequests,
  updateLeaveRequestStatus,
} = require('../data/leaveRequests');

const router = express.Router();

/**
 * @swagger
 * /api/leave-requests:
 *   post:
 *     summary: Submit a leave request for the current user
 *     tags: [LeaveRequests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromDate, toDate, reason]
 *             properties:
 *               fromDate: { type: string }
 *               toDate: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Leave request created (status pending)
 *       400:
 *         description: Missing required field
 */
router.post('/leave-requests', requireAuth, async (req, res) => {
  const { fromDate, toDate, reason } = req.body || {};
  if (!fromDate || !toDate || !reason) {
    return res
      .status(400)
      .json({ message: 'fromDate, toDate and reason are required' });
  }

  const request = await createLeaveRequest(req.user.id, { fromDate, toDate, reason });
  res.status(201).json(request);
});

/**
 * @swagger
 * /api/leave-requests:
 *   get:
 *     summary: List leave requests (self for employees, all/filterable for admins)
 *     tags: [LeaveRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *     responses:
 *       200:
 *         description: List of leave requests
 */
router.get('/leave-requests', requireAuth, async (req, res) => {
  const { status } = req.query;
  if (req.user.role === 'admin') {
    return res.json(await listLeaveRequests({ status }));
  }

  res.json(await listLeaveRequests({ employeeId: req.user.id, status }));
});

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   patch:
 *     summary: Approve or reject a leave request (admin only)
 *     tags: [LeaveRequests]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *     responses:
 *       200:
 *         description: Updated leave request
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Leave request not found
 *       403:
 *         description: Caller is not an admin
 */
router.patch('/leave-requests/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
  }

  const request = await updateLeaveRequestStatus(req.params.id, status);
  if (!request) {
    return res.status(404).json({ message: 'Leave request not found' });
  }

  res.json(request);
});

module.exports = router;
