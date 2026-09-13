const { getDb, nextId } = require('../store/mongoClient');

function collection() {
  return getDb().collection('employees');
}

async function findUser(username, password) {
  return collection().findOne({ username, password });
}

async function findByUsername(username) {
  return collection().findOne({ username });
}

async function findById(id) {
  return collection().findOne({ id: Number(id) });
}

// Returns the employee without the password field (or Mongo's own _id),
// safe to send back to clients.
function toPublicProfile(employee) {
  if (!employee) return employee;
  const { password, _id, ...publicProfile } = employee;
  return publicProfile;
}

async function listEmployees() {
  const employees = await collection().find({}).toArray();
  return employees.map(toPublicProfile);
}

async function createEmployee(payload) {
  const exists = await collection().findOne({ username: payload.username });
  if (exists) {
    const error = new Error('Username already exists');
    error.status = 400;
    throw error;
  }

  const employee = {
    id: await nextId('employees'),
    username: payload.username,
    password: payload.password,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone || '',
    position: payload.position || '',
    department: payload.department || '',
    role: payload.role === 'admin' ? 'admin' : 'employee',
    joinDate: payload.joinDate || new Date().toISOString().slice(0, 10),
    baseSalary: Number(payload.baseSalary) || 0,
  };

  await collection().insertOne(employee);
  return toPublicProfile(employee);
}

async function updateEmployee(id, payload) {
  const employee = await collection().findOne({ id: Number(id) });
  if (!employee) return null;

  const editableFields = [
    'fullName',
    'email',
    'phone',
    'position',
    'department',
    'role',
    'joinDate',
    'baseSalary',
  ];

  const update = {};
  editableFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (field === 'role') {
        update[field] = payload[field] === 'admin' ? 'admin' : 'employee';
      } else if (field === 'baseSalary') {
        update[field] = Number(payload[field]) || 0;
      } else {
        update[field] = payload[field];
      }
    }
  });

  if (Object.keys(update).length === 0) {
    return toPublicProfile(employee);
  }

  await collection().updateOne({ id: Number(id) }, { $set: update });
  const updated = await collection().findOne({ id: Number(id) });
  return toPublicProfile(updated);
}

async function deleteEmployee(id) {
  const result = await collection().deleteOne({ id: Number(id) });
  return result.deletedCount > 0;
}

module.exports = {
  findUser,
  findByUsername,
  findById,
  toPublicProfile,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
