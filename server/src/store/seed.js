// Seeds default data on first connect. Every check below is independent
// and idempotent — safe to run on every server start, on a database in
// any partial state.
const DEMO_EMPLOYEES = [
  {
    username: 'admin',
    password: '123456',
    fullName: 'Admin User',
    email: 'admin@example.com',
    phone: '',
    position: 'HR Manager',
    department: 'HR',
    role: 'admin',
    joinDate: '2024-01-01',
    baseSalary: 0,
  },
  {
    username: 'employee1',
    password: '123456',
    fullName: 'Nguyen Van A',
    email: 'employee1@example.com',
    phone: '',
    position: 'Developer',
    department: 'Engineering',
    role: 'employee',
    joinDate: '2024-03-01',
    baseSalary: 0,
  },
];

async function ensureSeedData(db) {
  const employees = db.collection('employees');
  const employeeCount = await employees.countDocuments();
  if (employeeCount === 0) {
    const docs = DEMO_EMPLOYEES.map((employee, index) => ({
      ...employee,
      id: index + 1,
    }));
    await employees.insertMany(docs);
    await db
      .collection('counters')
      .updateOne(
        { _id: 'employees' },
        { $set: { seq: docs.length } },
        { upsert: true }
      );
  }

  const counters = db.collection('counters');
  const zeroInitCollections = ['attendance', 'leaveRequests', 'payrollRecords'];
  for (const name of zeroInitCollections) {
    const existing = await counters.findOne({ _id: name });
    if (!existing) {
      await counters.insertOne({ _id: name, seq: 0 });
    }
  }

  const settings = db.collection('settings');
  const existingSettings = await settings.findOne({ key: 'global' });
  if (!existingSettings) {
    await settings.insertOne({ key: 'global', standardWorkDays: 26 });
  }
}

module.exports = { ensureSeedData };
