'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // List all current blocks
  const blocks = await db.collection('pageblocks').find({}).toArray();
  console.log('\nCurrent page blocks:');
  blocks.forEach(b => {
    console.log(`  [${b._id}] "${b.title}" page:${b.page} type:${b.type} content:${(b.content||'').substring(0,40)}`);
  });

  // Ask user which to delete — for now delete all blocks that are stuck in "header" page
  // that have image-link type (the thumbnail issue)
  const stuck = blocks.filter(b =>
    (b.page === 'header' || b.page === 'sidebar') &&
    b.type === 'image-link' &&
    b.title === 'Untitled Block'
  );

  if (stuck.length) {
    console.log(`\nDeleting ${stuck.length} stuck thumbnail block(s)...`);
    for (const b of stuck) {
      await db.collection('pageblocks').deleteOne({ _id: b._id });
      console.log(`  Deleted: "${b.title}" (${b.page})`);
    }
  } else {
    console.log('\nNo stuck blocks found — all blocks look correct.');
  }

  // Fix order numbers
  const remaining = await db.collection('pageblocks').find({}).sort({ order: 1 }).toArray();
  for (let i = 0; i < remaining.length; i++) {
    await db.collection('pageblocks').updateOne({ _id: remaining[i]._id }, { $set: { order: i } });
  }
  console.log(`\n✅ Done. ${remaining.length} blocks remain.`);

  await client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
