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
