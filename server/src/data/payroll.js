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
