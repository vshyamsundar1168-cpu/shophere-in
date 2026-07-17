'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // Delete ALL blocks with page:"header" - they cause thumbnail beside logo
  const r1 = await db.collection('pageblocks').deleteMany({ page: 'header' });
  console.log(`Deleted ${r1.deletedCount} header blocks`);

  // Also delete any blocks with page:"between" that were accidental
  const blocks = await db.collection('pageblocks').find({}).toArray();
  console.log(`\nRemaining blocks (${blocks.length}):`);
  blocks.forEach(b => console.log(`  "${b.title}" page:${b.page} type:${b.type}`));

  await client.close();
  console.log('\nDone!');
}
main().catch(e => { console.error(e.message); process.exit(1); });
