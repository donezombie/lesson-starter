const { getDb, nextId, omitMongoId, omitMongoIdMany } = require('../store/mongoClient');

function collection() {
  return getDb().collection('attendance');
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function checkIn(employeeId) {
  const openRecord = await collection().findOne({
    employeeId,
    checkOut: null,
  });
  if (openRecord) {
    const error = new Error('Already checked in, check out first');
    error.status = 400;
    throw error;
  }

  const record = {
    id: await nextId('attendance'),
    employeeId,
    date: todayDate(),
    checkIn: new Date().toISOString(),
    checkOut: null,
  };

  await collection().insertOne(record);
  return omitMongoId(record);
}

async function checkOut(employeeId) {
  const record = await collection().findOne({
    employeeId,
    checkOut: null,
  });
  if (!record) {
    const error = new Error('No open check-in found');
    error.status = 400;
    throw error;
  }

  const checkOutTime = new Date().toISOString();
  await collection().updateOne(
    { id: record.id },
    { $set: { checkOut: checkOutTime } }
  );

  return omitMongoId({ ...record, checkOut: checkOutTime });
}

async function listAttendance({ employeeId } = {}) {
  const query = employeeId === undefined ? {} : { employeeId: Number(employeeId) };
  const records = await collection().find(query).toArray();
  return omitMongoIdMany(records);
}

module.exports = { checkIn, checkOut, listAttendance };
