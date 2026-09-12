const fileStore = require('../store/fileStore');

function findUser(username, password) {
  const db = fileStore.read();
  return db.employees.find(
    (e) => e.username === username && e.password === password
  );
}

function findByUsername(username) {
  const db = fileStore.read();
  return db.employees.find((e) => e.username === username);
}

function findById(id) {
  const db = fileStore.read();
  return db.employees.find((e) => e.id === Number(id));
}

// Returns the employee without the password field, safe to send back to clients.
function toPublicProfile(employee) {
  const { password, ...publicProfile } = employee;
  return publicProfile;
}

function listEmployees() {
  const db = fileStore.read();
  return db.employees.map(toPublicProfile);
}

function createEmployee(payload) {
  const db = fileStore.read();
  const exists = db.employees.some((e) => e.username === payload.username);
  if (exists) {
    const error = new Error('Username already exists');
    error.status = 400;
    throw error;
  }

  const employee = {
    id: fileStore.nextId(db, 'employees'),
    username: payload.username,
    password: payload.password,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone || '',
    position: payload.position || '',
    department: payload.department || '',
    role: payload.role === 'admin' ? 'admin' : 'employee',
    joinDate: payload.joinDate || new Date().toISOString().slice(0, 10),
  };

  db.employees.push(employee);
  fileStore.write(db);
  return toPublicProfile(employee);
}

function updateEmployee(id, payload) {
  const db = fileStore.read();
  const employee = db.employees.find((e) => e.id === Number(id));
  if (!employee) return null;

  const editableFields = [
    'fullName',
    'email',
    'phone',
    'position',
    'department',
    'role',
    'joinDate',
  ];
  editableFields.forEach((field) => {
    if (payload[field] !== undefined) {
      employee[field] = payload[field];
    }
  });

  fileStore.write(db);
  return toPublicProfile(employee);
}

function deleteEmployee(id) {
  const db = fileStore.read();
  const index = db.employees.findIndex((e) => e.id === Number(id));
  if (index === -1) return false;

  db.employees.splice(index, 1);
  fileStore.write(db);
  return true;
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
