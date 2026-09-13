# MongoDB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the server's file-backed JSON data store
(`server/src/store/fileStore.js` + `server/src/data/db.json`) with MongoDB
(a real Atlas cluster the user has already connected to), with **zero
change** to business logic, route paths, status codes, or API response
shapes — client code needs no changes at all.

**Architecture:** A single `server/src/store/mongoClient.js` owns the
MongoDB connection, a `nextId(collection)` counter (replacing the old
file-based sequence), and an `omitMongoId` helper that strips Mongo's
`_id` before data ever reaches a route. Every `server/src/data/*.js`
module is rewritten to use Mongo collections instead of the in-memory
`db` object, but keeps its exact function names/signatures — only the
return type changes from a value to a `Promise` of that same value. Every
route handler that calls into these modules gains `async`/`await`. The
app's own `id` numbering scheme (plain integers, used everywhere as
foreign keys) is preserved exactly — Mongo's own `_id` (ObjectId) is
generated automatically per document but never used by the application.

**Tech Stack:** Express (unchanged), `mongodb` (native driver, already
installed by the user, v7), new: `dotenv` (load `.env`). No ODM (no
Mongoose) — the native driver is used directly, matching what's already
installed.

**Spec:** `docs/superpowers/specs/2026-09-13-mongodb-migration-design.md`

## Global Constraints

- **Do NOT run `git commit` anywhere.** The user is committing everything
  themselves once they've reviewed it. Implementers only edit files and
  verify; there is no commit step in any task below.
- **Never write the real MongoDB connection string into this plan, into
  any report file, or into any committed-looking doc.** It currently lives
  in plaintext in `server/src/server.js` (line assigned to `const uri = ...`)
  — a leftover from the Atlas "Connect" UI snippet the user pasted. Task 1
  instructs the implementer to copy that exact value directly from
  `server.js` into `server/.env` (a file, not a doc) without ever quoting
  it in a report or chat-visible text.
- No test framework exists in this repo; verify with real `curl` calls
  against a running `npm run dev` server, hitting the actual connected
  Mongo cluster (not a mock).
- **Business logic must not change.** Every formula (payroll calculation),
  validation rule (username uniqueness, `standardWorkDays` must be a
  positive integer, one open attendance record per employee, leave-request
  status enum, etc.), and access-control rule (which routes need
  `requireRole('admin')`) carries over exactly as it exists today. This
  migration is a storage-engine swap only.
- **The app's own integer `id` scheme is preserved.** Never expose or key
  off Mongo's `_id` anywhere in a route or client-facing response — every
  data-module function must strip it via the `omitMongoId`/`omitMongoIdMany`
  helpers from `mongoClient.js` (or, for `employees.js`, the existing
  `toPublicProfile` helper, extended to also drop `_id`) before returning.
- Every data-module function keeps its exact existing name and parameter
  list — only its return value becomes a `Promise` of what it used to
  return synchronously. Callers (routes, other data modules) must add
  `await`.
- CommonJS style throughout, matching the existing server code.

---

## Task 1: MongoDB connection, seeding, and server bootstrap

**Files:**
- Modify: `server/package.json` (add `dotenv` dependency)
- Create: `server/.env` (gitignored — already covered by the existing
  `.env` line in `server/.gitignore`)
- Create: `server/.env.example`
- Create: `server/src/store/mongoClient.js`
- Create: `server/src/store/seed.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Produces: `connectMongo(): Promise<Db>` (connects once, seeds if empty,
  must be called and awaited before the app starts listening — consumed
  by `server.js` this task, nothing else needs it directly),
  `getDb(): Db` (throws if called before `connectMongo()` resolved —
  consumed by every data module in Tasks 2-5),
  `nextId(collectionName: string): Promise<number>` (atomic counter,
  consumed by Tasks 2-5's `createEmployee`/`checkIn`/`createLeaveRequest`/
  `generatePayroll`), `omitMongoId(doc): object`,
  `omitMongoIdMany(docs[]): object[]` (strip Mongo's `_id` — consumed by
  Tasks 3-5; Task 2's `employees.js` uses its own existing
  `toPublicProfile` instead, extended to also drop `_id`).

- [ ] **Step 1: Add the `dotenv` dependency**

In `server/package.json`, add `dotenv` to `dependencies` (alongside the
existing `express`, `mongodb`, `swagger-jsdoc`, `swagger-ui-express`):
```json
    "dotenv": "^16.4.5",
```
Then run `cd server && npm install` to actually install it.

- [ ] **Step 2: Move the real connection string out of `server.js` into `server/.env`**

Open `server/src/server.js` and find the line:
```js
const uri = "mongodb+srv://...";
```
Copy that exact string value (do not retype it, do not paraphrase it, and
do not put it in your report — copy-paste the file's own current value).

Create `server/.env` with:
```
MONGO_URI=<paste the exact value here, without quotes around it>
MONGO_DB_NAME=hrm
```

- [ ] **Step 3: Create `server/.env.example`** (safe to be tracked by git — no real value)

```
MONGO_URI=your-mongodb-connection-string
MONGO_DB_NAME=hrm
```

- [ ] **Step 4: Write `server/src/store/mongoClient.js`**

```js
const { MongoClient } = require('mongodb');

let client;
let db;

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set — copy server/.env.example to server/.env and fill it in');
  }

  client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGO_DB_NAME || 'hrm';
  db = client.db(dbName);

  const { ensureSeedData } = require('./seed');
  await ensureSeedData(db);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB is not connected yet — connectMongo() must be awaited before use');
  }
  return db;
}

// Atomic per-collection counter, replacing the old file store's in-memory
// sequence. mongodb driver v7 returns the updated document directly (not
// wrapped in { value }) unless includeResultMetadata: true is passed.
async function nextId(collectionName) {
  const counters = getDb().collection('counters');
  const result = await counters.findOneAndUpdate(
    { _id: collectionName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

// The app never uses Mongo's own _id — strip it before any document
// reaches a route handler or the client.
function omitMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

function omitMongoIdMany(docs) {
  return docs.map(omitMongoId);
}

module.exports = {
  connectMongo,
  getDb,
  nextId,
  omitMongoId,
  omitMongoIdMany,
};
```

- [ ] **Step 5: Write `server/src/store/seed.js`**

```js
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
```

- [ ] **Step 6: Update `server/src/server.js`**

Replace the ad-hoc Atlas test snippet (the `const uri = ...` /
`MongoClient` / `run()` block near the top) with a proper `dotenv` load
and a call to `connectMongo()` that gates `app.listen(...)`. The full file
should end up as:

```js
require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const helloRoute = require('./routes/hello.route');
const authRoute = require('./routes/auth.route');
const meRoute = require('./routes/me.route');
const employeeRoute = require('./routes/employee.route');
const attendanceRoute = require('./routes/attendance.route');
const leaveRoute = require('./routes/leave.route');
const payrollRoute = require('./routes/payroll.route');
const { connectMongo } = require('./store/mongoClient');

const app = express();
const PORT = process.env.PORT || 4100;

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/', authRoute);
app.use('/api', helloRoute);
app.use('/api', meRoute);
app.use('/api', employeeRoute);
app.use('/api', attendanceRoute);
app.use('/api', leaveRoute);
app.use('/api', payrollRoute);

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });
```

(At this point in the plan, every route still calls the OLD, synchronous,
file-backed data modules — those are untouched until Tasks 2-6. This step
only adds the Mongo connection alongside the still-working old system, so
the app keeps working end-to-end after this task, same as before.)

- [ ] **Step 7: Verify**

First, confirm the connection + seeding logic works in isolation:
```bash
cd server
node -e "
require('dotenv').config();
const { connectMongo, getDb, nextId } = require('./src/store/mongoClient');
connectMongo().then(async () => {
  const db = getDb();
  const employees = await db.collection('employees').find({}).toArray();
  console.log('employees:', employees.length, employees.map((e) => e.username));
  const settings = await db.collection('settings').findOne({ key: 'global' });
  console.log('settings:', JSON.stringify(settings));
  const counters = await db.collection('counters').find({}).toArray();
  console.log('counters:', JSON.stringify(counters));
  const idA = await nextId('attendance');
  const idB = await nextId('attendance');
  console.log('nextId is sequential:', idB === idA + 1);
  process.exit(0);
}).catch((err) => { console.error('FAILED:', err); process.exit(1); });
"
```
Expected:
```
employees: 2 [ 'admin', 'employee1' ]
settings: {"_id":...,"key":"global","standardWorkDays":26}
counters: [ ... 4 entries: employees(2), attendance(0), leaveRequests(0), payrollRecords(0) ... ]
nextId is sequential: true
```

Run the exact same command a second time — output must show the same 2
employees (not 4), the same settings, and `counters.attendance` now at 2
(from the two `nextId` calls above) — proving seeding is idempotent and
doesn't duplicate data on a second connect.

Then confirm the server itself still boots normally (old routes still
work against the old file store, unaffected by this task; the point here
is just that the new Mongo connection doesn't prevent startup):
```bash
cd server && npm run dev
```
In another shell: `curl -s http://localhost:4100/health` → expect
`{"status":"ok"}`. Stop the dev server after verifying.

- [ ] **Step 8: No commit** (see Global Constraints)

---

## Task 2: `employees.js` → MongoDB

**Files:**
- Modify: `server/src/data/employees.js` (full rewrite of internals; same
  exports)

**Interfaces:**
- Consumes: `getDb()`, `nextId('employees')` (Task 1).
- Produces: same as before —
  `findUser(username, password): Promise<Employee | null>`,
  `findByUsername(username): Promise<Employee | null>`,
  `findById(id): Promise<Employee | null>`,
  `toPublicProfile(employee): PublicEmployee` (still synchronous, still
  strips `password` — now also strips Mongo's `_id`),
  `listEmployees(): Promise<PublicEmployee[]>`,
  `createEmployee(payload): Promise<PublicEmployee>` (throws `Error` with
  `.status = 400` on duplicate username),
  `updateEmployee(id, payload): Promise<PublicEmployee | null>`,
  `deleteEmployee(id): Promise<boolean>`. All consumed by Tasks 5-6 (Task
  5's `payroll.js` calls `listEmployees`/`findById`; Task 6's routes/
  middleware call all of them).

- [ ] **Step 1: Rewrite `server/src/data/employees.js`**

```js
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
```

- [ ] **Step 2: Verify**

```bash
cd server
node -e "
require('dotenv').config();
const { connectMongo } = require('./src/store/mongoClient');
const employees = require('./src/data/employees');

connectMongo().then(async () => {
  const admin = await employees.findUser('admin', '123456');
  console.log('findUser admin:', admin && admin.username, admin && admin.role);

  const wrongPassword = await employees.findUser('admin', 'wrong');
  console.log('findUser wrong password:', wrongPassword);

  const list = await employees.listEmployees();
  console.log('listEmployees count:', list.length, 'has password field:', 'password' in list[0], 'has _id field:', '_id' in list[0]);

  const created = await employees.createEmployee({ username: 'mongotest', password: 'x', fullName: 'Mongo Test', email: 'mongotest@example.com', baseSalary: 5000000 });
  console.log('created:', created.id, created.username, created.baseSalary, 'has password field:', 'password' in created);

  try {
    await employees.createEmployee({ username: 'mongotest', password: 'x', fullName: 'Dup', email: 'dup@example.com' });
    console.log('BUG: duplicate username should have thrown');
  } catch (e) {
    console.log('duplicate username correctly rejected:', e.status, e.message);
  }

  const updated = await employees.updateEmployee(created.id, { department: 'QA', baseSalary: 6000000 });
  console.log('updated:', updated.department, updated.baseSalary);

  const deleted = await employees.deleteEmployee(created.id);
  console.log('deleted:', deleted);

  const afterDelete = await employees.findById(created.id);
  console.log('findById after delete:', afterDelete);

  process.exit(0);
}).catch((err) => { console.error('FAILED:', err); process.exit(1); });
"
```
Expected:
```
findUser admin: admin admin
findUser wrong password: null
listEmployees count: 2 has password field: false has _id field: false
created: 3 mongotest 5000000 has password field: false
duplicate username correctly rejected: 400 Username already exists
updated: QA 6000000
deleted: true
findById after delete: null
```

- [ ] **Step 3: No commit**

---

## Task 3: `attendance.js` → MongoDB

**Files:**
- Modify: `server/src/data/attendance.js` (full rewrite of internals; same
  exports)

**Interfaces:**
- Consumes: `getDb()`, `nextId('attendance')`, `omitMongoId`,
  `omitMongoIdMany` (Task 1).
- Produces: same as before — `checkIn(employeeId): Promise<AttendanceRecord>`
  (throws `.status = 400` if an open record exists),
  `checkOut(employeeId): Promise<AttendanceRecord>` (throws `.status = 400`
  if no open record), `listAttendance({ employeeId? }): Promise<AttendanceRecord[]>`.
  Consumed by Task 5's `payroll.js` (`countActualWorkDays` calls
  `listAttendance`) and Task 6's `attendance.route.js`.

- [ ] **Step 1: Rewrite `server/src/data/attendance.js`**

```js
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
```

- [ ] **Step 2: Verify**

```bash
cd server
node -e "
require('dotenv').config();
const { connectMongo } = require('./src/store/mongoClient');
const attendance = require('./src/data/attendance');

connectMongo().then(async () => {
  const testEmployeeId = 999001; // scratch id, not a real seeded employee

  const record = await attendance.checkIn(testEmployeeId);
  console.log('checkIn:', record.employeeId, record.checkOut === null, 'has _id:', '_id' in record);

  try {
    await attendance.checkIn(testEmployeeId);
    console.log('BUG: second check-in should have thrown');
  } catch (e) {
    console.log('second check-in correctly rejected:', e.status, e.message);
  }

  const out = await attendance.checkOut(testEmployeeId);
  console.log('checkOut:', out.checkOut !== null, 'has _id:', '_id' in out);

  try {
    await attendance.checkOut(testEmployeeId);
    console.log('BUG: check-out with no open record should have thrown');
  } catch (e) {
    console.log('check-out with no open record correctly rejected:', e.status, e.message);
  }

  const own = await attendance.listAttendance({ employeeId: testEmployeeId });
  console.log('listAttendance for test employee:', own.length, 'has _id:', own.some((r) => '_id' in r));

  process.exit(0);
}).catch((err) => { console.error('FAILED:', err); process.exit(1); });
"
```
Expected:
```
checkIn: 999001 true has _id: false
second check-in correctly rejected: 400 Already checked in, check out first
checkOut: true has _id: false
check-out with no open record correctly rejected: 400 No open check-in found
listAttendance for test employee: 1 has _id: false
```

(This leaves one scratch attendance record for a nonexistent employee id
`999001` in the database — harmless test data, ignored by every real
query since no real employee has that id. No cleanup needed.)

- [ ] **Step 3: No commit**

---

## Task 4: `leaveRequests.js` + `settings.js` → MongoDB

**Files:**
- Modify: `server/src/data/leaveRequests.js` (full rewrite of internals;
  same exports)
- Modify: `server/src/data/settings.js` (full rewrite of internals; same
  exports)

**Interfaces:**
- Consumes: `getDb()`, `nextId('leaveRequests')`, `omitMongoId`,
  `omitMongoIdMany` (Task 1) for `leaveRequests.js`; `getDb()` for
  `settings.js`.
- Produces: `leaveRequests.js` — same as before:
  `createLeaveRequest(employeeId, { fromDate, toDate, reason }): Promise<LeaveRequest>`,
  `listLeaveRequests({ employeeId?, status? }): Promise<LeaveRequest[]>`,
  `updateLeaveRequestStatus(id, status): Promise<LeaveRequest | null>`.
  `settings.js` — same as before: `getSettings(): Promise<{ standardWorkDays: number }>`,
  `updateSettings(payload): Promise<{ standardWorkDays: number }>` (throws
  `.status = 400` for a non-positive-integer value). Both consumed by
  Task 5 (`payroll.js` now calls `settings.getSettings()` instead of
  reaching into a raw `db` object — a small, safe cleanup made possible by
  this being an async rewrite anyway) and Task 6's routes.

- [ ] **Step 1: Rewrite `server/src/data/leaveRequests.js`**

```js
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
```

- [ ] **Step 2: Rewrite `server/src/data/settings.js`**

```js
const { getDb } = require('../store/mongoClient');

function collection() {
  return getDb().collection('settings');
}

async function getSettings() {
  const settings = await collection().findOne({ key: 'global' });
  const { _id, key, ...rest } = settings;
  return rest;
}

async function updateSettings(payload) {
  const nextStandardWorkDays = Number(payload.standardWorkDays);

  if (!Number.isInteger(nextStandardWorkDays) || nextStandardWorkDays <= 0) {
    const error = new Error('standardWorkDays must be a positive integer');
    error.status = 400;
    throw error;
  }

  await collection().updateOne(
    { key: 'global' },
    { $set: { standardWorkDays: nextStandardWorkDays } }
  );

  return getSettings();
}

module.exports = { getSettings, updateSettings };
```

- [ ] **Step 3: Verify**

```bash
cd server
node -e "
require('dotenv').config();
const { connectMongo } = require('./src/store/mongoClient');
const leaveRequests = require('./src/data/leaveRequests');
const settings = require('./src/data/settings');

connectMongo().then(async () => {
  const testEmployeeId = 999002;

  const request = await leaveRequests.createLeaveRequest(testEmployeeId, { fromDate: '2026-10-01', toDate: '2026-10-02', reason: 'test' });
  console.log('created request:', request.status, 'has _id:', '_id' in request);

  const listed = await leaveRequests.listLeaveRequests({ employeeId: testEmployeeId });
  console.log('listed for employee:', listed.length);

  const updated = await leaveRequests.updateLeaveRequestStatus(request.id, 'approved');
  console.log('updated status:', updated.status, 'has _id:', '_id' in updated);

  const missing = await leaveRequests.updateLeaveRequestStatus(999999999, 'approved');
  console.log('update nonexistent returns null:', missing === null);

  const current = await settings.getSettings();
  console.log('current settings:', JSON.stringify(current), 'has _id:', '_id' in current, 'has key:', 'key' in current);

  const changed = await settings.updateSettings({ standardWorkDays: 22 });
  console.log('changed settings:', JSON.stringify(changed));

  try {
    await settings.updateSettings({ standardWorkDays: -5 });
    console.log('BUG: invalid value should have thrown');
  } catch (e) {
    console.log('invalid value correctly rejected:', e.status, e.message);
  }

  // restore default for later tasks' verification
  await settings.updateSettings({ standardWorkDays: 26 });

  process.exit(0);
}).catch((err) => { console.error('FAILED:', err); process.exit(1); });
"
```
Expected:
```
created request: pending has _id: false
listed for employee: 1
updated status: approved has _id: false
update nonexistent returns null: true
current settings: {"standardWorkDays":22} has _id: false has key: false
changed settings: {"standardWorkDays":22}
invalid value correctly rejected: 400 standardWorkDays must be a positive integer
```
(The script itself restores `standardWorkDays` back to `26` at the end so
later tasks' verification isn't affected by this test run.)

- [ ] **Step 4: No commit**

---

## Task 5: `payroll.js` → MongoDB

**Files:**
- Modify: `server/src/data/payroll.js` (full rewrite of internals; same
  exports)

**Interfaces:**
- Consumes: `getDb()`, `nextId('payrollRecords')` (Task 1),
  `listAttendance` (Task 3), `listEmployees`/`findById` (Task 2),
  `getSettings` (Task 4).
- Produces: same as before —
  `getSummary(month): Promise<SummaryRow[]>`,
  `generatePayroll(employeeId, month, { adjustment?, note? }): Promise<PayrollRecord>`
  (throws `.status = 400` if the employee doesn't exist; upserts by
  `(employeeId, month)`, keeping the same `id` on overwrite),
  `updatePayrollAdjustment(id, { adjustment?, note? }): Promise<PayrollRecord | null>`
  (never recomputes `actualWorkDays`),
  `listPayroll({ employeeId?, month? }): Promise<PayrollRecord[]>`. All
  consumed by Task 6's `payroll.route.js`.

- [ ] **Step 1: Rewrite `server/src/data/payroll.js`**

```js
const { getDb, nextId } = require('../store/mongoClient');
const { listAttendance } = require('./attendance');
const { listEmployees, findById } = require('./employees');
const { getSettings } = require('./settings');

function collection() {
  return getDb().collection('payrollRecords');
}

// A "work day" in a given month = a distinct attendance date (YYYY-MM-DD)
// for that employee whose value starts with the "YYYY-MM" month string.
async function countActualWorkDays(employeeId, month) {
  const records = await listAttendance({ employeeId });
  const uniqueDates = new Set(
    records.filter((r) => r.date.startsWith(month)).map((r) => r.date)
  );
  return uniqueDates.size;
}

function calculateTotalPay({
  baseSalary,
  standardWorkDays,
  actualWorkDays,
  adjustment,
}) {
  const proratedBase =
    standardWorkDays > 0 ? (baseSalary / standardWorkDays) * actualWorkDays : 0;
  return Math.round(proratedBase) + (Number(adjustment) || 0);
}

async function getSummary(month) {
  const employees = await listEmployees();
  const { standardWorkDays } = await getSettings();

  return Promise.all(
    employees.map(async (employee) => {
      const actualWorkDays = await countActualWorkDays(employee.id, month);
      const existing = await collection().findOne({
        employeeId: employee.id,
        month,
      });
      const baseSalary = employee.baseSalary || 0;
      const estimatedPay = calculateTotalPay({
        baseSalary,
        standardWorkDays,
        actualWorkDays,
        adjustment: existing ? existing.adjustment : 0,
      });

      return {
        employeeId: employee.id,
        fullName: employee.fullName,
        baseSalary,
        standardWorkDays,
        actualWorkDays,
        meetsRequirement: actualWorkDays >= standardWorkDays,
        estimatedPay,
        existingRecordId: existing ? existing.id : null,
        existingAdjustment: existing ? existing.adjustment : null,
        existingNote: existing ? existing.note : null,
        existingActualWorkDays: existing ? existing.actualWorkDays : null,
        existingTotalPay: existing ? existing.totalPay : null,
      };
    })
  );
}

async function generatePayroll(employeeId, month, { adjustment = 0, note = '' } = {}) {
  const employee = await findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found');
    error.status = 400;
    throw error;
  }

  const { standardWorkDays } = await getSettings();
  const actualWorkDays = await countActualWorkDays(Number(employeeId), month);
  const baseSalary = employee.baseSalary || 0;
  const resolvedAdjustment = Number(adjustment) || 0;
  const totalPay = calculateTotalPay({
    baseSalary,
    standardWorkDays,
    actualWorkDays,
    adjustment: resolvedAdjustment,
  });

  const existing = await collection().findOne({
    employeeId: Number(employeeId),
    month,
  });

  const record = {
    id: existing ? existing.id : await nextId('payrollRecords'),
    employeeId: Number(employeeId),
    month,
    baseSalary,
    standardWorkDays,
    actualWorkDays,
    adjustment: resolvedAdjustment,
    totalPay,
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  await collection().updateOne(
    { employeeId: Number(employeeId), month },
    { $set: record },
    { upsert: true }
  );

  return record;
}

async function updatePayrollAdjustment(id, { adjustment, note } = {}) {
  const record = await collection().findOne({ id: Number(id) });
  if (!record) return null;

  const update = {};
  if (adjustment !== undefined) {
    update.adjustment = Number(adjustment) || 0;
  }
  if (note !== undefined) {
    update.note = note;
  }

  const nextAdjustment =
    update.adjustment !== undefined ? update.adjustment : record.adjustment;
  update.totalPay = calculateTotalPay({
    baseSalary: record.baseSalary,
    standardWorkDays: record.standardWorkDays,
    actualWorkDays: record.actualWorkDays,
    adjustment: nextAdjustment,
  });

  await collection().updateOne({ id: Number(id) }, { $set: update });

  const { _id, ...rest } = record;
  return { ...rest, ...update };
}

async function listPayroll({ employeeId, month } = {}) {
  const query = {};
  if (employeeId !== undefined) query.employeeId = Number(employeeId);
  if (month !== undefined) query.month = month;

  const records = await collection().find(query).toArray();
  return records.map(({ _id, ...rest }) => rest);
}

module.exports = {
  getSummary,
  generatePayroll,
  updatePayrollAdjustment,
  listPayroll,
};
```

- [ ] **Step 2: Verify**

```bash
cd server
node -e "
require('dotenv').config();
const { connectMongo } = require('./src/store/mongoClient');
const payroll = require('./src/data/payroll');
const attendance = require('./src/data/attendance');

connectMongo().then(async () => {
  const employeeId = 2; // seeded employee1
  const month = new Date().toISOString().slice(0, 7);

  await attendance.checkIn(employeeId);
  await attendance.checkOut(employeeId);

  const summaryBefore = await payroll.getSummary(month);
  const rowBefore = summaryBefore.find((r) => r.employeeId === employeeId);
  console.log('actualWorkDays:', rowBefore.actualWorkDays, 'existingRecordId:', rowBefore.existingRecordId);

  const generated = await payroll.generatePayroll(employeeId, month, { adjustment: 500000, note: 'test' });
  console.log('generated:', generated.id, generated.adjustment, generated.totalPay, 'has _id:', '_id' in generated);

  const summaryAfter = await payroll.getSummary(month);
  const rowAfter = summaryAfter.find((r) => r.employeeId === employeeId);
  console.log('existingRecordId after generate:', rowAfter.existingRecordId, 'existingActualWorkDays:', rowAfter.existingActualWorkDays, 'existingTotalPay:', rowAfter.existingTotalPay);

  const regenerated = await payroll.generatePayroll(employeeId, month, { adjustment: 100000, note: 'corrected' });
  console.log('regenerated keeps same id:', regenerated.id === generated.id, 'new adjustment:', regenerated.adjustment);

  const edited = await payroll.updatePayrollAdjustment(generated.id, { adjustment: 999999 });
  console.log('edited adjustment:', edited.adjustment, 'actualWorkDays unchanged:', edited.actualWorkDays === regenerated.actualWorkDays, 'has _id:', '_id' in edited);

  const byEmployee = await payroll.listPayroll({ employeeId });
  console.log('listPayroll by employeeId:', byEmployee.length, 'has _id:', byEmployee.some((r) => '_id' in r));

  try {
    await payroll.generatePayroll(999999, month, {});
    console.log('BUG: nonexistent employee should have thrown');
  } catch (e) {
    console.log('nonexistent employee correctly rejected:', e.status, e.message);
  }

  process.exit(0);
}).catch((err) => { console.error('FAILED:', err); process.exit(1); });
"
```
Expected (exact `actualWorkDays` may already be 1+ if run more than once
the same day — the important assertions are the booleans/relationships,
not the absolute count):
```
actualWorkDays: 1 existingRecordId: null
generated: 1 500000 ... has _id: false
existingRecordId after generate: 1 existingActualWorkDays: 1 existingTotalPay: ...
regenerated keeps same id: true new adjustment: 100000
edited adjustment: 999999 actualWorkDays unchanged: true has _id: false
listPayroll by employeeId: 1 has _id: false
nonexistent employee correctly rejected: 400 Employee not found
```

- [ ] **Step 3: No commit**

---

## Task 6: Routes & middleware — `async`/`await` wiring

**Files:**
- Modify: `server/src/middleware/auth.middleware.js`
- Modify: `server/src/routes/auth.route.js`
- Modify: `server/src/routes/me.route.js`
- Modify: `server/src/routes/employee.route.js`
- Modify: `server/src/routes/attendance.route.js`
- Modify: `server/src/routes/leave.route.js`
- Modify: `server/src/routes/payroll.route.js`

**Interfaces:**
- Consumes: every `data/*.js` module from Tasks 1-5 (now all async).
- Produces: the exact same routes, paths, status codes, and response
  shapes as before — this task changes only how each handler calls into
  the data layer (adding `async`/`await`), never what it returns or when
  it returns an error status.

This is the task where the whole app is reconnected end to end against
Mongo — every route handler in the app is touched.

**For every file in this task:** only the body of each `router.METHOD(...)`
callback changes (add `async` before the callback, add `await` before each
call into the data layer). Everything else in each file — the `require`s
at the top, the Swagger JSDoc block above each route, `const router = ...`,
`module.exports = router` — stays exactly as it is today. The code blocks
below show only the changed callbacks; find the matching existing handler
in each file by its route path and replace just that function, in place.

- [ ] **Step 1: Update `server/src/middleware/auth.middleware.js`**

Replace its full contents with:
```js
const { getUsername } = require('../store/tokenStore');
const { findByUsername, toPublicProfile } = require('../data/employees');

// Verifies the "Authorization: Bearer <token>" header against the
// in-memory token store, then looks up the employee record so req.user
// carries the full profile (including role) rather than just a username.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  const username = getUsername(token);
  if (!username) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const employee = await findByUsername(username);
    if (!employee) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = toPublicProfile(employee);
    req.token = token;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = requireAuth;
```

- [ ] **Step 2: Update `server/src/routes/auth.route.js`**

Change only the `/login` handler (leave `/logout` as-is — it doesn't touch
the data layer):
```js
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  const user = await findUser(username, password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = createToken(user.username);
  res.json({ token });
});
```

- [ ] **Step 3: Update `server/src/routes/me.route.js`**

```js
router.get('/me', requireAuth, async (req, res) => {
  const user = await findByUsername(req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(toPublicProfile(user));
});
```

- [ ] **Step 4: Update `server/src/routes/employee.route.js`**

Change all four handlers:
```js
router.get('/employees', requireAuth, requireRole('admin'), async (req, res) => {
  res.json(await listEmployees());
});

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

router.put('/employees/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const employee = await updateEmployee(req.params.id, req.body || {});
  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }
  res.json(employee);
});

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
```

- [ ] **Step 5: Update `server/src/routes/attendance.route.js`**

```js
router.post('/attendance/check-in', requireAuth, async (req, res) => {
  try {
    const record = await checkIn(req.user.id);
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

router.post('/attendance/check-out', requireAuth, async (req, res) => {
  try {
    const record = await checkOut(req.user.id);
    res.json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

router.get('/attendance', requireAuth, async (req, res) => {
  if (req.user.role === 'admin') {
    const { employeeId } = req.query;
    return res.json(await listAttendance({ employeeId }));
  }

  res.json(await listAttendance({ employeeId: req.user.id }));
});
```

- [ ] **Step 6: Update `server/src/routes/leave.route.js`**

```js
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

router.get('/leave-requests', requireAuth, async (req, res) => {
  const { status } = req.query;
  if (req.user.role === 'admin') {
    return res.json(await listLeaveRequests({ status }));
  }

  res.json(await listLeaveRequests({ employeeId: req.user.id, status }));
});

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
```

- [ ] **Step 7: Update `server/src/routes/payroll.route.js`**

```js
router.get('/settings', requireAuth, async (req, res) => {
  res.json(await getSettings());
});

router.put('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const settings = await updateSettings(req.body || {});
    res.json(settings);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

router.get('/payroll/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: 'month is required' });
  }

  res.json(await getSummary(month));
});

router.get('/payroll', requireAuth, async (req, res) => {
  const { month, employeeId } = req.query;

  if (req.user.role === 'admin') {
    return res.json(await listPayroll({ month, employeeId }));
  }

  res.json(await listPayroll({ month, employeeId: req.user.id }));
});

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

router.patch('/payroll/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const record = await updatePayrollAdjustment(req.params.id, req.body || {});
  if (!record) {
    return res.status(404).json({ message: 'Payroll record not found' });
  }

  res.json(record);
});
```

- [ ] **Step 8: Verify — full end-to-end smoke test against the real Mongo cluster**

```bash
cd server && npm run dev
```
In another shell:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4100/login -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
EMP_TOKEN=$(curl -s -X POST http://localhost:4100/login -H "Content-Type: application/json" -d '{"username":"employee1","password":"123456"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

curl -s http://localhost:4100/api/me -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: admin profile, no password/_id field

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/api/employees -H "Authorization: Bearer $EMP_TOKEN"
# expect: 403

curl -s http://localhost:4100/api/employees -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: array of employees, no password/_id fields

curl -s -X POST http://localhost:4100/api/employees -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"username":"e2etest","password":"x","fullName":"E2E Test","email":"e2e@example.com","baseSalary":10000000}'
# expect: 201, new employee with an id, baseSalary 10000000

curl -s -X POST http://localhost:4100/api/attendance/check-in -H "Authorization: Bearer $EMP_TOKEN"
# expect: 201
curl -s -X POST http://localhost:4100/api/attendance/check-out -H "Authorization: Bearer $EMP_TOKEN"
# expect: 200, checkOut set

curl -s -X POST http://localhost:4100/api/leave-requests -H "Authorization: Bearer $EMP_TOKEN" -H "Content-Type: application/json" -d '{"fromDate":"2026-10-01","toDate":"2026-10-02","reason":"e2e"}'
# expect: 201, status "pending"
LEAVE_ID=$(curl -s http://localhost:4100/api/leave-requests -H "Authorization: Bearer $EMP_TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
curl -s -X PATCH http://localhost:4100/api/leave-requests/$LEAVE_ID -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"status":"approved"}'
# expect: 200, status "approved"

MONTH=$(date +%Y-%m)
curl -s "http://localhost:4100/api/payroll/summary?month=$MONTH" -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: array, employee1's row shows actualWorkDays >= 1

curl -s -X POST http://localhost:4100/api/payroll/generate -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{\"employeeId\":2,\"month\":\"$MONTH\",\"adjustment\":0,\"note\":\"e2e\"}"
# expect: 201

curl -s "http://localhost:4100/api/payroll?month=$MONTH" -H "Authorization: Bearer $EMP_TOKEN"
# expect: employee1's own record only
```

Then restart the server (`Ctrl+C`, `npm run dev` again) and re-run the
`GET /api/employees`, `GET /api/attendance`, and
`GET /api/payroll?month=$MONTH` calls above with the SAME tokens — since
tokens are in-memory only, expect these specific calls to now 401 (this
is expected — it proves nothing crashed, and is why the next check
re-logs in): log in again as admin, then re-run `GET /api/employees` with
the new token and confirm `e2etest` is still present — proving the data
itself survived the restart (it lives in Mongo, not the server process).

Stop the dev server after verifying.

- [ ] **Step 9: No commit**

---

## Task 7: Cleanup — remove the file store, update docs

**Files:**
- Delete: `server/src/store/fileStore.js`
- Delete: `server/src/data/db.json` (if present)
- Modify: `server/.gitignore` (remove the now-meaningless `src/data/db.json` line)
- Modify: `README.md`

**Interfaces:** none — this task only removes now-dead code and updates
documentation; nothing in Tasks 1-6 depends on anything removed here (by
the end of Task 6, no file anywhere still `require`s `fileStore.js`).

- [ ] **Step 1: Confirm nothing still references the file store**

```bash
cd /Volumes/DATA/Arilliance/study
grep -rn "fileStore" server/src
```
Expected: no output (zero matches). If anything shows up, STOP and report
BLOCKED — it means an earlier task missed a call site; do not delete the
file until this is empty.

- [ ] **Step 2: Delete the old file-store files**

```bash
rm server/src/store/fileStore.js
rm -f server/src/data/db.json
```

- [ ] **Step 3: Remove the now-unused `.gitignore` line**

In `server/.gitignore`, remove the line `src/data/db.json` (the file it
referred to no longer exists and nothing will ever recreate it). The
remaining lines (`node_modules/`, `npm-debug.log*`, `.env`) stay as-is.

- [ ] **Step 4: Update `README.md`**

Replace the "Folder structure" code block's `store/`/`data/` lines:
```
        ├── store/          # Token store
        └── data/           # employees.js (seeded employee accounts/profiles) +
                             # gitignored, auto-seeded db.json (employees, attendance, leave requests)
```
with:
```
        ├── store/          # Token store + MongoDB connection (mongoClient.js, seed.js)
        └── data/           # employees.js, attendance.js, leaveRequests.js, settings.js,
                             # payroll.js — all backed by MongoDB collections
```

Insert a new step between the existing "## 1. Run the client" and
"## 2. Run the Express server" sections (renumbering the server section
to "## 3."):
```markdown
## 2. Configure the server's database connection

Copy `server/.env.example` to `server/.env` and set `MONGO_URI` to a real
MongoDB connection string (the server won't start without it):

\`\`\`bash
cd server
cp .env.example .env
# then edit .env and set MONGO_URI
\`\`\`
```

Add one line to the "## Notes" section:
```
- Data lives in MongoDB, not a local file. On first connect to an empty
  database, the server automatically seeds the two demo accounts and
  default settings (see `server/src/store/seed.js`).
```

- [ ] **Step 5: Verify**

```bash
cd server && npm run dev
```
Confirm it boots cleanly (no `Cannot find module './fileStore'` or similar
error) and `curl -s http://localhost:4100/health` still returns
`{"status":"ok"}`. Stop the dev server after verifying.

- [ ] **Step 6: No commit**
