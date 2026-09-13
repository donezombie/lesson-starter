const { getDb, nextId, omitMongoId, omitMongoIdMany } = require('../store/mongoClient');

function collection() {
  return getDb().collection('leaveRequests');
}

async function createLeaveRequest(employeeId, { fromDate, toDate, reason }) {
  const request = {
    id: await nextId('leaveRequests'),
    employeeId,
    fromDate,
    toDate,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await collection().insertOne(request);
  return omitMongoId(request);
}

async function listLeaveRequests({ employeeId, status } = {}) {
  const query = {};
  if (employeeId !== undefined) query.employeeId = Number(employeeId);
  if (status !== undefined) query.status = status;

  const requests = await collection().find(query).toArray();
  return omitMongoIdMany(requests);
}

async function updateLeaveRequestStatus(id, status) {
  const request = await collection().findOne({ id: Number(id) });
  if (!request) return null;

  await collection().updateOne({ id: Number(id) }, { $set: { status } });
  return omitMongoId({ ...request, status });
}

module.exports = { createLeaveRequest, listLeaveRequests, updateLeaveRequestStatus };
