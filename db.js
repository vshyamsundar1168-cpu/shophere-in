'use strict';
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] FATAL: MONGODB_URI environment variable is not set.');
    console.error('[DB] Go to Render Dashboard → your service → Environment → add MONGODB_URI');
    process.exit(1);
  }
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db('shophere');
    console.log('[DB] Connected to MongoDB Atlas — database: shophere');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Check that MONGODB_URI is correct and MongoDB Atlas allows connections from 0.0.0.0/0');
    process.exit(1);
  }
}

function getDb() {
  if (!db) throw new Error('DB not initialised');
  return db;
}

module.exports = { connectDB, getDb };
