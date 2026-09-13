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
