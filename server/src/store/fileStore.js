const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Seed data: admin/123456 (quản lý) + one demo employee/123456 (nhân viên).
// Demo credentials only — never use plaintext passwords like this in production.
const DEFAULT_DB = {
  employees: [
    {
      id: 1,
      username: 'admin',
      password: '123456',
      fullName: 'Admin User',
      email: 'admin@example.com',
      phone: '',
      position: 'HR Manager',
      department: 'HR',
      role: 'admin',
      joinDate: '2024-01-01',
    },
    {
      id: 2,
      username: 'employee1',
      password: '123456',
      fullName: 'Nguyen Van A',
      email: 'employee1@example.com',
      phone: '',
      position: 'Developer',
      department: 'Engineering',
      role: 'employee',
      joinDate: '2024-03-01',
    },
  ],
  attendance: [],
  leaveRequests: [],
  sequences: { employees: 2, attendance: 0, leaveRequests: 0 },
};

function read() {
  if (!fs.existsSync(DB_PATH)) {
    write(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function write(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(db, collection) {
  db.sequences[collection] += 1;
  return db.sequences[collection];
}

module.exports = { read, write, nextId, DB_PATH };
