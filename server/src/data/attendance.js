const fileStore = require('../store/fileStore');

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function checkIn(employeeId) {
  const db = fileStore.read();
  const openRecord = db.attendance.find(
    (a) => a.employeeId === employeeId && a.checkOut === null
  );
  if (openRecord) {
    const error = new Error('Already checked in, check out first');
    error.status = 400;
    throw error;
  }

  const record = {
    id: fileStore.nextId(db, 'attendance'),
    employeeId,
    date: todayDate(),
    checkIn: new Date().toISOString(),
    checkOut: null,
  };

  db.attendance.push(record);
  fileStore.write(db);
  return record;
}

function checkOut(employeeId) {
  const db = fileStore.read();
  const record = db.attendance.find(
    (a) => a.employeeId === employeeId && a.checkOut === null
  );
  if (!record) {
    const error = new Error('No open check-in found');
    error.status = 400;
    throw error;
  }

  record.checkOut = new Date().toISOString();
  fileStore.write(db);
  return record;
}

function listAttendance({ employeeId } = {}) {
  const db = fileStore.read();
  if (employeeId === undefined) return db.attendance;
  return db.attendance.filter((a) => a.employeeId === Number(employeeId));
}

module.exports = { checkIn, checkOut, listAttendance };
