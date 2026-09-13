# Quản Lý Ngày Công & Lương Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly work-day summary (see who actually met the standard
number of work days) and a payroll feature (base salary per employee,
admin "finalizes" pay each month from actual attendance, with a manual
adjustment) on top of the existing HRM app.

**Architecture:** Backend: one new company-wide setting
(`standardWorkDays`) and one new collection (`payrollRecords`) in the
existing JSON file store; a new `payroll.js` data module computes actual
work days straight from the existing `attendance` collection (no new
tracking needed) and derives pay; one new route file
(`payroll.route.js`) exposes settings + payroll endpoints behind the
existing `requireAuth`/`requireRole('admin')` middleware. Frontend: one
new page (`/payroll`, both roles, contents differ by role) following the
exact service → module → page layering already used for
Employees/Attendance/LeaveRequests; a `baseSalary` field is added to the
existing Employee form.

**Tech Stack:** Same as the base HRM app — Express (CommonJS) on the
server; React, TypeScript, `@tanstack/react-query`, Formik + Yup,
`react-i18next` on the client. No new npm packages.

**Spec:** `docs/superpowers/specs/2026-09-13-payroll-workdays-design.md`

## Global Constraints

- No new npm dependencies — every task uses packages already declared in
  `server/package.json` / `client/package.json`.
- **Do NOT run `git commit` anywhere, in either repository, for any task.**
  The user is committing everything themselves once they've reviewed it.
  Implementers only edit files and verify; there is no commit step in any
  task below (this differs from how the base HRM plan started — it was
  changed mid-way and stays changed for this plan).
- `client/` is its own independent git repository nested inside the study
  repo (remote `origin` = the user's personal template repo) — irrelevant
  here only because nothing is being committed, but still worth knowing:
  never run any `git` mutating command in either repo.
- Server data continues to live in `server/src/data/db.json` (gitignored,
  auto-seeded by `fileStore.read()` on first call). Existing local
  `db.json` files predate the new `settings`/`payrollRecords` collections —
  **delete `server/src/data/db.json` before verifying Task 1** so it
  reseeds with the new shape; every later backend/frontend task's
  verification assumes that seed is in place.
- **`react-i18next` is strictly typed in this codebase**: `t("some.key")`
  only compiles if `"some.key"` exists in
  `client/src/i18n/en/shared.json` (the type augmentation in
  `client/src/@types/resources.ts` imports that exact file). Any task that
  adds a `t("payroll.xyz")` call MUST add `"xyz"` under `"payroll"` in
  **both** `en/shared.json` and `vi/shared.json` in that same task — never
  defer translation keys to a later task, the build will fail immediately.
- Follow existing code style exactly: CommonJS on the server; the
  `//! State` / `//! Function` / `//! Render` comment banding, Formik+Yup
  forms, react-query hooks via `services/*.ts` → `modules/*.ts` → page, on
  the client.
- No automated test framework exists in this repo. Verify backend tasks
  with `curl` against a running `npm run dev` server (per the base HRM
  plan's pattern); verify frontend tasks with `npm run build` (must exit 0)
  — and, because `vite build` does not itself type-check (esbuild strips
  types), also run `npx tsc --noEmit` from `client/` and confirm it reports
  no *new* errors (three pre-existing errors — `ui/loading.tsx` casing,
  two `useFiltersHandler.ts` unused-`event` params — are known, unrelated,
  and must stay as they are; do not fix them, just don't add to the count).
- Money values are plain numbers (no currency formatting beyond
  JavaScript's `toLocaleString()` for thousands separators) and are never
  negative-guarded beyond what's specified below — this is a "cơ bản" demo
  project, not an accounting system.

---

## Task 1: Data layer — settings, employee base salary, new seed shape

**Files:**
- Modify: `server/src/store/fileStore.js`
- Modify: `server/src/data/employees.js`
- Create: `server/src/data/settings.js`

**Interfaces:**
- Produces: `fileStore`'s `DEFAULT_DB` now includes `settings: { standardWorkDays: 26 }`,
  `payrollRecords: []`, and `sequences.payrollRecords: 0` (consumed by Task 2's
  `payroll.js`). `employees.js`'s `createEmployee`/`updateEmployee` now
  accept/persist a `baseSalary: number` field (consumed by Task 2's
  `getSummary`/`generatePayroll`, which reads `employee.baseSalary`).
  `settings.js` exports `getSettings(): { standardWorkDays: number }` and
  `updateSettings(payload): { standardWorkDays: number }` (throws an `Error`
  with `.status = 400` if `payload.standardWorkDays` isn't a positive
  integer) — consumed by Task 3's route.

- [ ] **Step 1: Add the two new collections to `fileStore.js`'s `DEFAULT_DB`**

In `server/src/store/fileStore.js`, change:
```js
  attendance: [],
  leaveRequests: [],
  sequences: { employees: 2, attendance: 0, leaveRequests: 0 },
};
```
to:
```js
  attendance: [],
  leaveRequests: [],
  settings: { standardWorkDays: 26 },
  payrollRecords: [],
  sequences: {
    employees: 2,
    attendance: 0,
    leaveRequests: 0,
    payrollRecords: 0,
  },
};
```

- [ ] **Step 2: Add `baseSalary` to `employees.js`**

In `server/src/data/employees.js`, in `createEmployee`, change:
```js
    role: payload.role === 'admin' ? 'admin' : 'employee',
    joinDate: payload.joinDate || new Date().toISOString().slice(0, 10),
  };
```
to:
```js
    role: payload.role === 'admin' ? 'admin' : 'employee',
    joinDate: payload.joinDate || new Date().toISOString().slice(0, 10),
    baseSalary: Number(payload.baseSalary) || 0,
  };
```

In `updateEmployee`, change:
```js
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
      if (field === 'role') {
        employee[field] = payload[field] === 'admin' ? 'admin' : 'employee';
      } else {
        employee[field] = payload[field];
      }
    }
  });
```
to:
```js
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
  editableFields.forEach((field) => {
    if (payload[field] !== undefined) {
      if (field === 'role') {
        employee[field] = payload[field] === 'admin' ? 'admin' : 'employee';
      } else if (field === 'baseSalary') {
        employee[field] = Number(payload[field]) || 0;
      } else {
        employee[field] = payload[field];
      }
    }
  });
```

- [ ] **Step 3: Write `server/src/data/settings.js`**

```js
const fileStore = require('../store/fileStore');

function getSettings() {
  const db = fileStore.read();
  return db.settings;
}

function updateSettings(payload) {
  const db = fileStore.read();
  const nextStandardWorkDays = Number(payload.standardWorkDays);

  if (!Number.isInteger(nextStandardWorkDays) || nextStandardWorkDays <= 0) {
    const error = new Error('standardWorkDays must be a positive integer');
    error.status = 400;
    throw error;
  }

  db.settings.standardWorkDays = nextStandardWorkDays;
  fileStore.write(db);
  return db.settings;
}

module.exports = { getSettings, updateSettings };
```

- [ ] **Step 4: Verify**

```bash
rm -f server/src/data/db.json
cd server && node -e "
const s = require('./src/store/fileStore');
const db = s.read();
console.log(JSON.stringify(db.settings), db.payrollRecords.length, db.sequences.payrollRecords);
"
```
Expected: `{"standardWorkDays":26} 0 0`

```bash
node -e "
const { createEmployee, updateEmployee } = require('./src/data/employees');
const created = createEmployee({ username: 'salarytest', password: 'x', fullName: 'Salary Test', email: 'st@example.com', baseSalary: 12000000 });
console.log('created.baseSalary =', created.baseSalary);
const updated = updateEmployee(created.id, { baseSalary: 15000000 });
console.log('updated.baseSalary =', updated.baseSalary);
const invalidSalary = createEmployee({ username: 'salarytest2', password: 'x', fullName: 'Salary Test 2', email: 'st2@example.com' });
console.log('default baseSalary when omitted =', invalidSalary.baseSalary);
"
```
Expected:
```
created.baseSalary = 12000000
updated.baseSalary = 15000000
default baseSalary when omitted = 0
```

```bash
node -e "
const { updateSettings, getSettings } = require('./src/data/settings');
console.log('before:', JSON.stringify(getSettings()));
console.log('after:', JSON.stringify(updateSettings({ standardWorkDays: 24 })));
try {
  updateSettings({ standardWorkDays: -5 });
  console.log('BUG: should have thrown');
} catch (e) {
  console.log('correctly rejected invalid value:', e.status, e.message);
}
"
```
Expected:
```
before: {"standardWorkDays":26}
after: {"standardWorkDays":24}
correctly rejected invalid value: 400 standardWorkDays must be a positive integer
```

Delete the scratch data file again afterward so later tasks start clean:
`rm -f server/src/data/db.json`

- [ ] **Step 5: No commit** (see Global Constraints — do not run `git commit`)

---

## Task 2: Payroll computation — `server/src/data/payroll.js`

**Files:**
- Create: `server/src/data/payroll.js`

**Interfaces:**
- Consumes: `fileStore.read()`/`write()`/`nextId()` (Task 1),
  `listAttendance({ employeeId })` from `server/src/data/attendance.js`
  (pre-existing), `listEmployees()`/`findById(id)` from
  `server/src/data/employees.js` (Task 1 adds `baseSalary` to what these
  return).
- Produces: `getSummary(month: string): SummaryRow[]` where
  `SummaryRow = { employeeId, fullName, baseSalary, standardWorkDays,
  actualWorkDays, meetsRequirement, estimatedPay, existingRecordId,
  existingAdjustment, existingNote }` (`existingAdjustment`/`existingNote`
  are `null` when `existingRecordId` is `null`) — consumed by Task 3's
  `GET /api/payroll/summary` route.
  `generatePayroll(employeeId, month, { adjustment?, note? }): PayrollRecord`
  (throws `Error` with `.status = 400` if the employee doesn't exist) —
  upserts by `(employeeId, month)`, keeping the same `id` on overwrite —
  consumed by Task 3's `POST /api/payroll/generate`.
  `updatePayrollAdjustment(id, { adjustment?, note? }): PayrollRecord | null`
  (only touches `adjustment`/`note`, recomputes `totalPay` from the
  record's already-snapshotted `baseSalary`/`standardWorkDays`/
  `actualWorkDays` — never recomputes `actualWorkDays`) — consumed by
  Task 3's `PATCH /api/payroll/:id`.
  `listPayroll({ employeeId?, month? }): PayrollRecord[]` — consumed by
  Task 3's `GET /api/payroll`.
  `PayrollRecord = { id, employeeId, month, baseSalary, standardWorkDays,
  actualWorkDays, adjustment, totalPay, note, createdAt }`.

- [ ] **Step 1: Write `server/src/data/payroll.js`**

```js
const fileStore = require('../store/fileStore');
const { listAttendance } = require('./attendance');
const { listEmployees, findById } = require('./employees');

// A "work day" in a given month = a distinct attendance date (YYYY-MM-DD)
// for that employee whose value starts with the "YYYY-MM" month string.
function countActualWorkDays(employeeId, month) {
  const records = listAttendance({ employeeId });
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

function getSummary(month) {
  const db = fileStore.read();
  const employees = listEmployees();
  const standardWorkDays = db.settings.standardWorkDays;

  return employees.map((employee) => {
    const actualWorkDays = countActualWorkDays(employee.id, month);
    const existing = db.payrollRecords.find(
      (r) => r.employeeId === employee.id && r.month === month
    );
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
    };
  });
}

function generatePayroll(employeeId, month, { adjustment = 0, note = '' } = {}) {
  const db = fileStore.read();
  const employee = findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found');
    error.status = 400;
    throw error;
  }

  const standardWorkDays = db.settings.standardWorkDays;
  const actualWorkDays = countActualWorkDays(Number(employeeId), month);
  const baseSalary = employee.baseSalary || 0;
  const resolvedAdjustment = Number(adjustment) || 0;
  const totalPay = calculateTotalPay({
    baseSalary,
    standardWorkDays,
    actualWorkDays,
    adjustment: resolvedAdjustment,
  });

  const existingIndex = db.payrollRecords.findIndex(
    (r) => r.employeeId === Number(employeeId) && r.month === month
  );

  const record = {
    id:
      existingIndex === -1
        ? fileStore.nextId(db, 'payrollRecords')
        : db.payrollRecords[existingIndex].id,
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

  if (existingIndex === -1) {
    db.payrollRecords.push(record);
  } else {
    db.payrollRecords[existingIndex] = record;
  }

  fileStore.write(db);
  return record;
}

function updatePayrollAdjustment(id, { adjustment, note } = {}) {
  const db = fileStore.read();
  const record = db.payrollRecords.find((r) => r.id === Number(id));
  if (!record) return null;

  if (adjustment !== undefined) {
    record.adjustment = Number(adjustment) || 0;
  }
  if (note !== undefined) {
    record.note = note;
  }

  record.totalPay = calculateTotalPay({
    baseSalary: record.baseSalary,
    standardWorkDays: record.standardWorkDays,
    actualWorkDays: record.actualWorkDays,
    adjustment: record.adjustment,
  });

  fileStore.write(db);
  return record;
}

function listPayroll({ employeeId, month } = {}) {
  const db = fileStore.read();
  return db.payrollRecords.filter((r) => {
    if (employeeId !== undefined && r.employeeId !== Number(employeeId)) {
      return false;
    }
    if (month !== undefined && r.month !== month) return false;
    return true;
  });
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
rm -f server/src/data/db.json
cd server && node -e "
const { checkIn, checkOut } = require('./src/data/attendance');
const payroll = require('./src/data/payroll');

// employee1 has id 2 in the seed. Check in/out once (creates today's record).
checkIn(2);
checkOut(2);

const month = new Date().toISOString().slice(0, 7);
const summary = payroll.getSummary(month);
const employee1Row = summary.find((r) => r.employeeId === 2);
console.log('actualWorkDays for employee1 this month:', employee1Row.actualWorkDays);
console.log('standardWorkDays:', employee1Row.standardWorkDays);
console.log('meetsRequirement (should be false, 1 day < 26):', employee1Row.meetsRequirement);
console.log('existingRecordId (should be null, none generated yet):', employee1Row.existingRecordId);

const generated = payroll.generatePayroll(2, month, { adjustment: 500000, note: 'test bonus' });
console.log('generated:', JSON.stringify(generated));

const summaryAfter = payroll.getSummary(month);
const rowAfter = summaryAfter.find((r) => r.employeeId === 2);
console.log('existingRecordId after generate:', rowAfter.existingRecordId);
console.log('existingAdjustment after generate:', rowAfter.existingAdjustment);

const regenerated = payroll.generatePayroll(2, month, { adjustment: 100000, note: 'corrected' });
console.log('regenerated keeps same id:', regenerated.id === generated.id);
console.log('regenerated.adjustment:', regenerated.adjustment);

const edited = payroll.updatePayrollAdjustment(generated.id, { adjustment: 999999 });
console.log('edited.adjustment:', edited.adjustment, 'edited.actualWorkDays unchanged:', edited.actualWorkDays === generated.actualWorkDays);

console.log('listPayroll by employeeId:', payroll.listPayroll({ employeeId: 2 }).length);
console.log('listPayroll by month:', payroll.listPayroll({ month }).length);

try {
  payroll.generatePayroll(999, month, {});
  console.log('BUG: should have thrown for nonexistent employee');
} catch (e) {
  console.log('correctly rejected nonexistent employee:', e.status, e.message);
}
"
```
Expected (exact numbers may vary slightly if run on a day where `checkIn`/`checkOut`
already happened, but the shape and booleans below must match):
```
actualWorkDays for employee1 this month: 1
standardWorkDays: 26
meetsRequirement (should be false, 1 day < 26): false
existingRecordId (should be null, none generated yet): null
generated: {"id":1,"employeeId":2,"month":"...","baseSalary":0,"standardWorkDays":26,"actualWorkDays":1,"adjustment":500000,"totalPay":500000, ...}
existingRecordId after generate: 1
existingAdjustment after generate: 500000
regenerated keeps same id: true
regenerated.adjustment: 100000
edited.adjustment: 999999 edited.actualWorkDays unchanged: true
listPayroll by employeeId: 1
listPayroll by month: 1
correctly rejected nonexistent employee: 400 Employee not found
```
(`baseSalary` is `0` here because the seed's `employee1` has no `baseSalary`
set in this scratch run — that's expected and fine, the arithmetic still
proves out via `totalPay = round(0/26*1) + 500000 = 500000`.)

Delete the scratch data file again afterward: `rm -f server/src/data/db.json`

- [ ] **Step 3: No commit**

---

## Task 3: Payroll & settings routes

**Files:**
- Create: `server/src/routes/payroll.route.js`
- Modify: `server/src/server.js`

**Interfaces:**
- Consumes: `requireAuth`, `requireRole('admin')` (pre-existing
  middleware), `getSettings`/`updateSettings` (Task 1),
  `getSummary`/`generatePayroll`/`updatePayrollAdjustment`/`listPayroll`
  (Task 2).
- Produces: `GET/PUT /api/settings`, `GET /api/payroll/summary`,
  `GET /api/payroll`, `POST /api/payroll/generate`,
  `PATCH /api/payroll/:id`.

- [ ] **Step 1: Write `server/src/routes/payroll.route.js`**

```js
const express = require('express');

const requireAuth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const { getSettings, updateSettings } = require('../data/settings');
const {
  getSummary,
  generatePayroll,
  updatePayrollAdjustment,
  listPayroll,
} = require('../data/payroll');

const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get company-wide settings (standard work days)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current settings
 */
router.get('/settings', requireAuth, (req, res) => {
  res.json(getSettings());
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update the standard work days (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [standardWorkDays]
 *             properties:
 *               standardWorkDays: { type: integer }
 *     responses:
 *       200:
 *         description: Updated settings
 *       400:
 *         description: Invalid value
 *       403:
 *         description: Caller is not an admin
 */
router.put('/settings', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const settings = updateSettings(req.body || {});
    res.json(settings);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payroll/summary:
 *   get:
 *     summary: Live per-employee work-day/pay summary for a month (admin only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, example: "2026-09" }
 *     responses:
 *       200:
 *         description: Summary list
 *       400:
 *         description: Missing month
 *       403:
 *         description: Caller is not an admin
 */
router.get('/payroll/summary', requireAuth, requireRole('admin'), (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: 'month is required' });
  }

  res.json(getSummary(month));
});

/**
 * @swagger
 * /api/payroll:
 *   get:
 *     summary: List payroll records (self for employees, all/filterable for admins)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of payroll records
 */
router.get('/payroll', requireAuth, (req, res) => {
  const { month, employeeId } = req.query;

  if (req.user.role === 'admin') {
    return res.json(listPayroll({ month, employeeId }));
  }

  res.json(listPayroll({ month, employeeId: req.user.id }));
});

/**
 * @swagger
 * /api/payroll/generate:
 *   post:
 *     summary: Generate (or overwrite) a payroll record for an employee/month (admin only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, month]
 *             properties:
 *               employeeId: { type: integer }
 *               month: { type: string, example: "2026-09" }
 *               adjustment: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Payroll record created/updated
 *       400:
 *         description: Missing fields or employee not found
 *       403:
 *         description: Caller is not an admin
 */
router.post('/payroll/generate', requireAuth, requireRole('admin'), (req, res) => {
  const { employeeId, month, adjustment, note } = req.body || {};
  if (!employeeId || !month) {
    return res
      .status(400)
      .json({ message: 'employeeId and month are required' });
  }

  try {
    const record = generatePayroll(employeeId, month, { adjustment, note });
    res.status(201).json(record);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payroll/{id}:
 *   patch:
 *     summary: Edit the adjustment/note of an existing payroll record (admin only)
 *     tags: [Payroll]
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
 *             properties:
 *               adjustment: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Updated payroll record
 *       404:
 *         description: Payroll record not found
 *       403:
 *         description: Caller is not an admin
 */
router.patch('/payroll/:id', requireAuth, requireRole('admin'), (req, res) => {
  const record = updatePayrollAdjustment(req.params.id, req.body || {});
  if (!record) {
    return res.status(404).json({ message: 'Payroll record not found' });
  }

  res.json(record);
});

module.exports = router;
```

- [ ] **Step 2: Register the router in `server/src/server.js`**

Add the require alongside the other route requires:
```js
const payrollRoute = require('./routes/payroll.route');
```
Add the registration alongside the other `app.use('/api', ...)` lines
(after the existing `app.use('/api', leaveRoute);`, do not reorder or
touch the existing lines):
```js
app.use('/api', payrollRoute);
```

- [ ] **Step 3: Verify**

```bash
rm -f server/src/data/db.json
cd server && npm run dev
```
In another shell:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4100/login -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
EMP_TOKEN=$(curl -s -X POST http://localhost:4100/login -H "Content-Type: application/json" -d '{"username":"employee1","password":"123456"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

# settings: read (any authenticated user), write (admin only)
curl -s http://localhost:4100/api/settings -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: {"standardWorkDays":26}

curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:4100/api/settings -H "Authorization: Bearer $EMP_TOKEN" -H "Content-Type: application/json" -d '{"standardWorkDays":24}'
# expect: 403

curl -s -X PUT http://localhost:4100/api/settings -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"standardWorkDays":24}'
# expect: {"standardWorkDays":24}

curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:4100/api/settings -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"standardWorkDays":-1}'
# expect: 400

# employee checks in/out so there is at least one work day this month
curl -s -X POST http://localhost:4100/api/attendance/check-in -H "Authorization: Bearer $EMP_TOKEN" > /dev/null
curl -s -X POST http://localhost:4100/api/attendance/check-out -H "Authorization: Bearer $EMP_TOKEN" > /dev/null

MONTH=$(date +%Y-%m)

# summary: admin only
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4100/api/payroll/summary?month=$MONTH" -H "Authorization: Bearer $EMP_TOKEN"
# expect: 403

curl -s "http://localhost:4100/api/payroll/summary?month=$MONTH" -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: array with employee1's row showing actualWorkDays:1, meetsRequirement:false, existingRecordId:null

# generate payroll for employee1 (id 2)
curl -s -X POST http://localhost:4100/api/payroll/generate -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{\"employeeId\":2,\"month\":\"$MONTH\",\"adjustment\":300000,\"note\":\"test\"}"
# expect: 201, record with adjustment:300000

# employee sees own record; admin sees all
curl -s "http://localhost:4100/api/payroll?month=$MONTH" -H "Authorization: Bearer $EMP_TOKEN"
# expect: array with exactly that one record

curl -s "http://localhost:4100/api/payroll?month=$MONTH" -H "Authorization: Bearer $ADMIN_TOKEN"
# expect: same record present

# patch: edit adjustment only, actualWorkDays must stay the same
RECORD_ID=$(curl -s "http://localhost:4100/api/payroll?month=$MONTH" -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)[0].id))")
curl -s -X PATCH "http://localhost:4100/api/payroll/$RECORD_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"adjustment":777}'
# expect: 200, adjustment:777, actualWorkDays still 1

curl -s -o /dev/null -w "%{http_code}\n" -X PATCH "http://localhost:4100/api/payroll/$RECORD_ID" -H "Authorization: Bearer $EMP_TOKEN" -H "Content-Type: application/json" -d '{"adjustment":1}'
# expect: 403
```
Stop the dev server after verifying. Delete the scratch data file again:
`rm -f server/src/data/db.json`

- [ ] **Step 4: No commit**

---

## Task 4: Employee base salary field (client)

**Files:**
- Modify: `client/src/interfaces/user.ts`
- Modify: `client/src/pages/Employees/EmployeeFormDialog.tsx`
- Modify: `client/src/pages/Employees/index.tsx`
- Modify: `client/src/i18n/en/shared.json`
- Modify: `client/src/i18n/vi/shared.json`

**Interfaces:**
- Produces: `UserInfo.baseSalary: number` (consumed by Task 6's Payroll
  page, which reads `employee.baseSalary` indirectly via the backend
  summary — no direct cross-file dependency, but keeps the type accurate
  everywhere `UserInfo` is used).

Work from: `/Volumes/DATA/Arilliance/study/client` (its own git repo).
**Do NOT run `git commit`.**

- [ ] **Step 1: Add `baseSalary` to `UserInfo`**

In `client/src/interfaces/user.ts`, add the field:
```ts
export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: "admin" | "employee";
  joinDate: string;
  baseSalary: number;
}
```

- [ ] **Step 2: Add the i18n keys (both files, same task)**

In `client/src/i18n/en/shared.json`, inside the existing `"employees"` →
`"dialog"` object, add a `"baseSalary"` key next to `"position"`:
```json
      "position": "Position",
      "baseSalary": "Base salary",
```
In `client/src/i18n/vi/shared.json`, same location:
```json
      "position": "Chức vụ",
      "baseSalary": "Lương cơ bản",
```

- [ ] **Step 3: Add the field to `EmployeeFormDialog.tsx`**

In `client/src/pages/Employees/EmployeeFormDialog.tsx`:

Add `baseSalary: string` to the `EmployeeFormValues` interface (kept as a
string in Formik state, like other text inputs — converted to a number at
submit time in `Employees/index.tsx`, not here):
```ts
export interface EmployeeFormValues {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: { label: string; value: string } | null;
  joinDate: string;
  baseSalary: string;
}
```

In the `initialValues` object, add:
```ts
    baseSalary:
      employee?.baseSalary !== undefined ? String(employee.baseSalary) : "0",
```
(placed right after the `joinDate` line, before the closing `};`).

In the form JSX, add a new `FormikField` right after the `department`
field and before the `role` `SelectField`:
```tsx
                  <FormikField
                    component={InputField}
                    name="baseSalary"
                    type="number"
                    label={t("employees.dialog.baseSalary")}
                  />
```

- [ ] **Step 4: Send `baseSalary` on submit in `Employees/index.tsx`**

In `client/src/pages/Employees/index.tsx`, in `handleSubmitForm`, add
`baseSalary` to the `body` object being built:
```ts
      const body = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        position: values.position,
        department: values.department,
        role: (values.role?.value || "employee") as "admin" | "employee",
        joinDate: values.joinDate,
        baseSalary: Number(values.baseSalary) || 0,
      };
```

- [ ] **Step 5: Verify**

```bash
cd client && npm run build
```
Expected: exits 0, no TypeScript errors.

```bash
npx tsc --noEmit
```
Expected: only the three known pre-existing errors (see Global
Constraints), nothing new.

- [ ] **Step 6: No commit**

---

## Task 5: Payroll & settings client plumbing (interfaces, services, modules)

**Files:**
- Modify: `client/src/consts/queriesKeys.ts`
- Create: `client/src/interfaces/settings.ts`
- Create: `client/src/interfaces/payroll.ts`
- Create: `client/src/services/settingsService.ts`
- Create: `client/src/services/payrollService.ts`
- Create: `client/src/modules/settings.ts`
- Create: `client/src/modules/payroll.ts`

**Interfaces:**
- Consumes: `httpService` (pre-existing, has `get`/`post`/`put`/`patch`),
  backend endpoints from Task 3.
- Produces: `useGetSettings()`, `useUpdateSettings()`,
  `useGetPayrollSummary(month: string, options?: { enabled?: boolean })`,
  `useGetPayroll(filters?: { month?: string; employeeId?: number })`,
  `useGeneratePayroll()`, `useUpdatePayrollAdjustment()` — all consumed by
  Task 6's Payroll page.

Work from: `client/`. **Do NOT run `git commit`.**

- [ ] **Step 1: Add the query keys**

In `client/src/consts/queriesKeys.ts`:
```ts
const queriesKeys = {
  getEmployees: "getEmployees",
  getAttendance: "getAttendance",
  getLeaveRequests: "getLeaveRequests",
  getSettings: "getSettings",
  getPayrollSummary: "getPayrollSummary",
  getPayroll: "getPayroll",
};

export default queriesKeys;
```

- [ ] **Step 2: Write `client/src/interfaces/settings.ts`**

```ts
export interface AppSettings {
  standardWorkDays: number;
}
```

- [ ] **Step 3: Write `client/src/interfaces/payroll.ts`**

```ts
export interface PayrollRecord {
  id: number;
  employeeId: number;
  month: string;
  baseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  adjustment: number;
  totalPay: number;
  note: string;
  createdAt: string;
}

export interface PayrollSummaryRow {
  employeeId: number;
  fullName: string;
  baseSalary: number;
  standardWorkDays: number;
  actualWorkDays: number;
  meetsRequirement: boolean;
  estimatedPay: number;
  existingRecordId: number | null;
  existingAdjustment: number | null;
  existingNote: string | null;
}
```

- [ ] **Step 4: Write `client/src/services/settingsService.ts`**

```ts
import httpService from "./httpService";
import { PromiseResponseBase } from "@/interfaces/common";
import { AppSettings } from "@/interfaces/settings";

class SettingsService {
  getSettings(): PromiseResponseBase<AppSettings> {
    return httpService.get(`/api/settings`);
  }

  updateSettings(standardWorkDays: number): PromiseResponseBase<AppSettings> {
    return httpService.put(`/api/settings`, { standardWorkDays });
  }
}

export default new SettingsService();
```

- [ ] **Step 5: Write `client/src/services/payrollService.ts`**

```ts
import httpService from "./httpService";
import { PromiseResponseBase } from "@/interfaces/common";
import { PayrollRecord, PayrollSummaryRow } from "@/interfaces/payroll";

export interface RequestGeneratePayroll {
  employeeId: number;
  month: string;
  adjustment?: number;
  note?: string;
}

export interface RequestUpdatePayrollAdjustment {
  adjustment?: number;
  note?: string;
}

class PayrollService {
  getSummary(month: string): PromiseResponseBase<PayrollSummaryRow[]> {
    return httpService.get(`/api/payroll/summary`, { params: { month } });
  }

  getPayroll(
    filters: { month?: string; employeeId?: number } = {}
  ): PromiseResponseBase<PayrollRecord[]> {
    return httpService.get(`/api/payroll`, { params: filters });
  }

  generatePayroll(
    body: RequestGeneratePayroll
  ): PromiseResponseBase<PayrollRecord> {
    return httpService.post(`/api/payroll/generate`, body);
  }

  updateAdjustment(
    id: number,
    body: RequestUpdatePayrollAdjustment
  ): PromiseResponseBase<PayrollRecord> {
    return httpService.patch(`/api/payroll/${id}`, body);
  }
}

export default new PayrollService();
```

- [ ] **Step 6: Write `client/src/modules/settings.ts`**

```ts
import queriesKeys from "@/consts/queriesKeys";
import settingsService from "@/services/settingsService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetSettings = () =>
  useQuery({
    queryKey: [queriesKeys.getSettings],
    queryFn: async () => {
      const response = await settingsService.getSettings();
      return response.data;
    },
  });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (standardWorkDays: number) =>
      settingsService.updateSettings(standardWorkDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getSettings] });
      queryClient.invalidateQueries({
        queryKey: [queriesKeys.getPayrollSummary],
      });
    },
  });
};
```

- [ ] **Step 7: Write `client/src/modules/payroll.ts`**

```ts
import queriesKeys from "@/consts/queriesKeys";
import payrollService, {
  RequestGeneratePayroll,
  RequestUpdatePayrollAdjustment,
} from "@/services/payrollService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetPayrollSummary = (
  month: string,
  options?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: [queriesKeys.getPayrollSummary, month],
    queryFn: async () => {
      const response = await payrollService.getSummary(month);
      return response.data;
    },
    enabled: options?.enabled,
  });

export const useGetPayroll = (
  filters: { month?: string; employeeId?: number } = {}
) =>
  useQuery({
    queryKey: [queriesKeys.getPayroll, filters.month, filters.employeeId],
    queryFn: async () => {
      const response = await payrollService.getPayroll(filters);
      return response.data;
    },
  });

export const useGeneratePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestGeneratePayroll) =>
      payrollService.generatePayroll(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queriesKeys.getPayrollSummary],
      });
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getPayroll] });
    },
  });
};

export const useUpdatePayrollAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: RequestUpdatePayrollAdjustment;
    }) => payrollService.updateAdjustment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queriesKeys.getPayrollSummary],
      });
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getPayroll] });
    },
  });
};
```

- [ ] **Step 8: Verify**

```bash
cd client && npm run build && npx tsc --noEmit
```
Expected: `npm run build` exits 0; `tsc --noEmit` shows only the three
known pre-existing errors (nothing new — these files aren't imported by
any page yet, so this mostly proves the files themselves type-check in
isolation).

- [ ] **Step 9: No commit**

---

## Task 6: Payroll page + adjustment dialog

**Files:**
- Create: `client/src/pages/Payroll/PayrollAdjustDialog.tsx`
- Create: `client/src/pages/Payroll/index.tsx`
- Modify: `client/src/i18n/en/shared.json`
- Modify: `client/src/i18n/vi/shared.json`

**Interfaces:**
- Consumes: `useGetSettings`/`useUpdateSettings` (Task 5),
  `useGetPayrollSummary`/`useGetPayroll`/`useGeneratePayroll`/
  `useUpdatePayrollAdjustment` (Task 5), `PayrollSummaryRow` (Task 5),
  `useAuth()` (`isAdmin`, pre-existing), `useToggleDialog` (pre-existing,
  returns `[open, toggle, shouldRender] as const`), `Input`/`Button`/
  `Table*` UI primitives (pre-existing), `CommonIcons` (pre-existing,
  import as `@/components/CommonIcons` — matching the codebase's existing
  import casing convention, not the lowercase folder name, to avoid a
  `tsc` file-casing conflict already seen once in this project).
- Produces: the routable `Payroll` page component (wired into routing in
  Task 7).

Work from: `client/`. **Do NOT run `git commit`.**

- [ ] **Step 1: Add the i18n keys (both files, same task)**

In `client/src/i18n/en/shared.json`, add a new top-level `"payroll"` object
(place it after the `"leaveRequests"` object, before the closing `}` of
the file):
```json
  "payroll": {
    "heading": "Payroll",
    "month": "Month",
    "standardWorkDays": "Standard work days",
    "standardWorkDaysInvalid": "Standard work days must be a positive whole number",
    "adjustmentInvalid": "Adjustment must be a number",
    "actualWorkDays": "Actual work days",
    "statusLabel": "Status",
    "statusMet": "Sufficient",
    "statusShort": "Short",
    "baseSalary": "Base salary",
    "estimatedPay": "Estimated pay",
    "totalPay": "Total pay",
    "adjustment": "Adjustment",
    "note": "Note",
    "generate": "Finalize",
    "generateTitle": "Finalize payroll",
    "editTitle": "Edit payroll",
    "confirmGenerate": "Finalize"
  }
```
In `client/src/i18n/vi/shared.json`, the matching object in the same
position:
```json
  "payroll": {
    "heading": "Lương",
    "month": "Tháng",
    "standardWorkDays": "Ngày công chuẩn",
    "standardWorkDaysInvalid": "Ngày công chuẩn phải là số nguyên dương",
    "adjustmentInvalid": "Thưởng/phạt phải là một số",
    "actualWorkDays": "Ngày công thực tế",
    "statusLabel": "Trạng thái",
    "statusMet": "Đủ công",
    "statusShort": "Thiếu công",
    "baseSalary": "Lương cơ bản",
    "estimatedPay": "Lương dự kiến",
    "totalPay": "Thực nhận",
    "adjustment": "Thưởng/phạt",
    "note": "Ghi chú",
    "generate": "Chốt lương",
    "generateTitle": "Chốt lương",
    "editTitle": "Sửa lương",
    "confirmGenerate": "Chốt lương"
  }
```

After adding both, run this sanity check (mirrors how the base HRM plan's
i18n work was verified) to confirm the two files still have identical key
sets:
```bash
cd client && node -e '
const en = require("./src/i18n/en/shared.json");
const vi = require("./src/i18n/vi/shared.json");
function flatten(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v;
    }
    return acc;
  }, {});
}
const enKeys = Object.keys(flatten(en)).sort();
const viKeys = Object.keys(flatten(vi)).sort();
console.log("missing in vi:", enKeys.filter((k) => !viKeys.includes(k)));
console.log("missing in en:", viKeys.filter((k) => !enKeys.includes(k)));
'
```
Expected: both lines print `[]`.

- [ ] **Step 2: Write `client/src/pages/Payroll/PayrollAdjustDialog.tsx`**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import { Button } from "@/components/ui/button";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";

export interface PayrollAdjustFormValues {
  adjustment: string;
  note: string;
}

interface PayrollAdjustDialogProps {
  isOpen: boolean;
  toggle: () => void;
  isEditing: boolean;
  fullName: string;
  actualWorkDays: number;
  initialAdjustment: number;
  initialNote: string;
  onSubmit: (values: PayrollAdjustFormValues) => void | Promise<any>;
}

const PayrollAdjustDialog = (props: PayrollAdjustDialogProps) => {
  const { t } = useTranslation("shared");
  const {
    isOpen,
    toggle,
    isEditing,
    fullName,
    actualWorkDays,
    initialAdjustment,
    initialNote,
    onSubmit,
  } = props;

  const initialValues: PayrollAdjustFormValues = {
    adjustment: String(initialAdjustment),
    note: initialNote,
  };

  return (
    <Dialog open={isOpen} onOpenChange={toggle}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("payroll.editTitle") : t("payroll.generateTitle")}
            </DialogTitle>
            <DialogDescription>
              {fullName} — {t("payroll.actualWorkDays")}: {actualWorkDays}
            </DialogDescription>
          </DialogHeader>

          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={Yup.object().shape({
              adjustment: Yup.number().typeError(
                t("payroll.adjustmentInvalid")
              ),
            })}
            onSubmit={onSubmit}
          >
            {({ isSubmitting }) => {
              return (
                <Form className="flex flex-col gap-3">
                  <FormikField
                    component={InputField}
                    name="adjustment"
                    type="number"
                    label={t("payroll.adjustment")}
                  />
                  <FormikField
                    component={InputField}
                    name="note"
                    label={t("payroll.note")}
                  />
                  <Button type="submit" isLoading={isSubmitting}>
                    {isEditing ? t("common.save") : t("payroll.confirmGenerate")}
                  </Button>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default PayrollAdjustDialog;
```

- [ ] **Step 3: Write `client/src/pages/Payroll/index.tsx`**

```tsx
import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import PageWrapper from "@/components/PageWrapper";
import CommonIcons from "@/components/CommonIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useToggleDialog from "@/hooks/useToggleDialog";
import { showError } from "@/helpers/toast";
import { useAuth } from "@/providers/AuthenticationProvider";
import { useGetSettings, useUpdateSettings } from "@/modules/settings";
import {
  useGeneratePayroll,
  useGetPayroll,
  useGetPayrollSummary,
  useUpdatePayrollAdjustment,
} from "@/modules/payroll";
import { PayrollSummaryRow } from "@/interfaces/payroll";
import PayrollAdjustDialog, {
  PayrollAdjustFormValues,
} from "./PayrollAdjustDialog";

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const Payroll = () => {
  //! State
  const { t } = useTranslation("shared");
  const { isAdmin } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth());
  const [standardWorkDaysInput, setStandardWorkDaysInput] = useState("");
  const [openDialog, toggleDialog, shouldRenderDialog] = useToggleDialog();
  const [selectedRow, setSelectedRow] = useState<PayrollSummaryRow | null>(
    null
  );

  const { data: settings } = useGetSettings();
  const { mutateAsync: updateSettings, isPending: isSavingSettings } =
    useUpdateSettings();

  const {
    data: summary,
    isPending: isSummaryPending,
    isRefetching: isRefetchingSummary,
    refetch: refetchSummary,
  } = useGetPayrollSummary(month, { enabled: isAdmin });

  const {
    data: ownRecords,
    isPending: isOwnPending,
    isRefetching: isRefetchingOwn,
    refetch: refetchOwn,
  } = useGetPayroll({ month });

  const { mutateAsync: generatePayroll } = useGeneratePayroll();
  const { mutateAsync: updateAdjustment } = useUpdatePayrollAdjustment();

  //! Function
  const handleSaveSettings = async () => {
    const nextValue = Number(standardWorkDaysInput);
    if (!Number.isInteger(nextValue) || nextValue <= 0) {
      showError(t("payroll.standardWorkDaysInvalid"));
      return;
    }

    try {
      await updateSettings(nextValue);
      toast(t("common.savedSuccessfully"), { type: "success" });
      setStandardWorkDaysInput("");
    } catch (error) {
      showError(error);
    }
  };

  const handleRefresh = () => {
    if (isAdmin) {
      refetchSummary();
    } else {
      refetchOwn();
    }
  };

  const handleOpenDialog = (row: PayrollSummaryRow) => {
    setSelectedRow(row);
    toggleDialog();
  };

  const handleSubmitDialog = async (values: PayrollAdjustFormValues) => {
    if (!selectedRow) return;

    const adjustment = Number(values.adjustment) || 0;

    try {
      if (selectedRow.existingRecordId) {
        await updateAdjustment({
          id: selectedRow.existingRecordId,
          body: { adjustment, note: values.note },
        });
      } else {
        await generatePayroll({
          employeeId: selectedRow.employeeId,
          month,
          adjustment,
          note: values.note,
        });
      }

      toast(t("common.savedSuccessfully"), { type: "success" });
      toggleDialog();
    } catch (error) {
      showError(error);
    }
  };

  //! Render
  return (
    <PageWrapper>
      <div className="component:Payroll w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t("payroll.heading")}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              onClick={handleRefresh}
              isLoading={isAdmin ? isRefetchingSummary : isRefetchingOwn}
            >
              <CommonIcons.RefreshCw className="icon mr-2 h-4 w-4" />
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-6 flex flex-wrap items-end gap-2 rounded-md border p-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                {t("payroll.standardWorkDays")}
              </label>
              <Input
                type="number"
                value={standardWorkDaysInput}
                placeholder={String(settings?.standardWorkDays ?? "")}
                onChange={(e) => setStandardWorkDaysInput(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSaveSettings}
              isLoading={isSavingSettings}
            >
              {t("common.save")}
            </Button>
          </div>
        )}

        {isAdmin ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.fullName")}</TableHead>
                <TableHead>{t("payroll.actualWorkDays")}</TableHead>
                <TableHead>{t("payroll.standardWorkDays")}</TableHead>
                <TableHead>{t("payroll.statusLabel")}</TableHead>
                <TableHead>{t("payroll.baseSalary")}</TableHead>
                <TableHead>{t("payroll.estimatedPay")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSummaryPending && (
                <TableRow>
                  <TableCell colSpan={7}>{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {(summary || []).map((row) => {
                return (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.actualWorkDays}</TableCell>
                    <TableCell>{row.standardWorkDays}</TableCell>
                    <TableCell>
                      {row.meetsRequirement
                        ? t("payroll.statusMet")
                        : t("payroll.statusShort")}
                    </TableCell>
                    <TableCell>{row.baseSalary.toLocaleString()}</TableCell>
                    <TableCell>{row.estimatedPay.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenDialog(row)}
                      >
                        {row.existingRecordId
                          ? t("common.edit")
                          : t("payroll.generate")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("payroll.month")}</TableHead>
                <TableHead>{t("payroll.actualWorkDays")}</TableHead>
                <TableHead>{t("payroll.baseSalary")}</TableHead>
                <TableHead>{t("payroll.adjustment")}</TableHead>
                <TableHead>{t("payroll.totalPay")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOwnPending && (
                <TableRow>
                  <TableCell colSpan={5}>{t("common.loading")}</TableCell>
                </TableRow>
              )}
              {(ownRecords || []).map((record) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell>{record.month}</TableCell>
                    <TableCell>{record.actualWorkDays}</TableCell>
                    <TableCell>{record.baseSalary.toLocaleString()}</TableCell>
                    <TableCell>{record.adjustment.toLocaleString()}</TableCell>
                    <TableCell>{record.totalPay.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {shouldRenderDialog && selectedRow && (
        <PayrollAdjustDialog
          isOpen={openDialog}
          toggle={toggleDialog}
          isEditing={!!selectedRow.existingRecordId}
          fullName={selectedRow.fullName}
          actualWorkDays={selectedRow.actualWorkDays}
          initialAdjustment={selectedRow.existingAdjustment ?? 0}
          initialNote={selectedRow.existingNote ?? ""}
          onSubmit={handleSubmitDialog}
        />
      )}
    </PageWrapper>
  );
};

export default Payroll;
```

- [ ] **Step 4: Verify**

```bash
cd client && npm run build && npx tsc --noEmit
```
Expected: `npm run build` exits 0; `tsc --noEmit` shows only the three
known pre-existing errors (this page isn't routed yet — that's Task 7 —
so this only proves the new files compile and type-check cleanly).

- [ ] **Step 5: No commit**

---

## Task 7: Wire the Payroll page into the app

**Files:**
- Modify: `client/src/consts/baseUrl.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Sidebar/index.tsx`
- Modify: `client/src/i18n/en/shared.json`
- Modify: `client/src/i18n/vi/shared.json`

**Interfaces:**
- Consumes: `Payroll` page component (Task 6).

Work from: `client/`. **Do NOT run `git commit`.**

- [ ] **Step 1: Add the i18n keys (both files, same task)**

In `client/src/i18n/en/shared.json`, inside the existing `"sidebar"`
object, add a `"payroll"` key next to `"leaveRequests"`:
```json
    "leaveRequests": "Leave requests",
    "payroll": "Payroll",
```
In `client/src/i18n/vi/shared.json`, same location:
```json
    "leaveRequests": "Đơn nghỉ phép",
    "payroll": "Lương",
```

- [ ] **Step 2: Add the route constant**

In `client/src/consts/baseUrl.ts`, add `Payroll` next to `LeaveRequests`:
```ts
  Employees: "/employees",
  Attendance: "/attendance",
  LeaveRequests: "/leave-requests",
  Payroll: "/payroll",
```

- [ ] **Step 3: Add the route in `App.tsx`**

Add the import alongside the other page imports:
```ts
import Payroll from "@/pages/Payroll";
```
Add the nested route alongside the other private routes (after the
`LeaveRequests` route, before the `Employees` route — order doesn't
functionally matter, but keep the file's existing routes in the same
relative order and just insert this one):
```tsx
            <Route path={BaseUrl.LeaveRequests} element={<LeaveRequests />} />
            <Route path={BaseUrl.Payroll} element={<Payroll />} />
            <Route path={BaseUrl.Employees} element={<AdminEmployees />} />
```
(Not wrapped in `withCheckRole` — both roles can access this route, same
as `Attendance`/`LeaveRequests`; the page itself branches on `isAdmin`.)

- [ ] **Step 4: Add the sidebar link**

In `client/src/components/Sidebar/index.tsx`, add a `"Payroll"` menu item
to the `menuItems` array, visible to both roles (unlike the admin-only
`Employees` entry) — place it right after `"Leave requests"` and before
the conditional `Employees` spread:
```ts
  const menuItems = [
    { label: t("sidebar.dashboard"), href: BaseUrl.Homepage },
    { label: t("sidebar.attendance"), href: BaseUrl.Attendance },
    { label: t("sidebar.leaveRequests"), href: BaseUrl.LeaveRequests },
    { label: t("sidebar.payroll"), href: BaseUrl.Payroll },
    ...(isAdmin
      ? [{ label: t("sidebar.employees"), href: BaseUrl.Employees }]
      : []),
  ];
```

- [ ] **Step 5: Verify — build**

```bash
cd client && npm run build && npx tsc --noEmit
```
Expected: `npm run build` exits 0; `tsc --noEmit` shows only the three
known pre-existing errors.

- [ ] **Step 6: Verify — full manual smoke test (end to end)**

In one terminal: `rm -f server/src/data/db.json && cd server && npm run dev`.
In another: `cd client && npm run dev`.

Simulate the flow via `curl` through the Vite dev proxy (no browser
available in this environment — for anything only observable in a
rendered UI, code-trace instead and say so explicitly in the report, same
approach as the base HRM plan's final integration task):

1. Log in as `admin`/`123456` and `employee1`/`123456` (both via
   `POST http://localhost:5173/login`), keep both tokens.
2. `curl http://localhost:5173/api/settings` with either token → `200`,
   `{"standardWorkDays":26}`.
3. Set employee1's base salary:
   `curl -X PUT http://localhost:5173/api/employees/2` (admin token) with
   `{"baseSalary":15000000}` → `200`, `baseSalary:15000000` in the
   response (this exercises Task 1's `updateEmployee` change end to end
   through the pre-existing employee route).
4. Employee1 checks in and out once (`POST .../api/attendance/check-in`,
   then `check-out`, employee token).
5. Admin fetches `GET /api/payroll/summary?month=<current YYYY-MM>` →
   employee1's row shows `actualWorkDays: 1`, `baseSalary: 15000000`,
   `meetsRequirement: false` (1 < 26), `existingRecordId: null`.
6. Admin calls `POST /api/payroll/generate` with
   `{"employeeId":2,"month":"<current>","adjustment":200000,"note":"test"}`
   → `201`, `totalPay` matches `round(15000000/26*1) + 200000`.
7. Employee1 calls `GET /api/payroll?month=<current>` (employee token) →
   sees exactly that one record, with the same `totalPay`.
8. Code-trace (not executable via curl — requires a rendered browser):
   read `Sidebar/index.tsx` and confirm the "Lương"/"Payroll" link is
   present for both roles unconditionally (unlike "Employees"); read
   `pages/Payroll/index.tsx` and confirm it renders the admin table (with
   the settings editor and the Finalize/Edit button) when `isAdmin` is
   true and the read-only own-history table otherwise, matching what
   steps 2–7 proved server-side.

Stop both dev servers when done. Delete the scratch data file again:
`rm -f server/src/data/db.json`

- [ ] **Step 7: No commit**
