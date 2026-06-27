'use strict';
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }
  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('shophere');
    console.log('[DB] Connected to MongoDB Atlas — database: shophere');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

function getDb() {
  if (!db) throw new Error('DB not initialised');
  return db;
}

module.exports = { connectDB, getDb };
