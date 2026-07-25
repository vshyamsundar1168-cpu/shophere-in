'use strict';
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '';
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  const blocks = await db.collection('pageblocks').find({}).toArray();
  console.log('Current blocks:');
  for (const b of blocks) {
    console.log(`  [${b._id}] "${b.title}" page:${b.page} position:${(b.style||{}).position||'none'}`);
    // Fix blocks with position:fixed that are stuck as floating overlays
    // Change them to normal inline blocks
    const s = b.style || {};
    if (s.position === 'fixed' || s.position === 'sticky') {
      const newStyle = { ...s };
      delete newStyle.position;
      delete newStyle.top;
      delete newStyle.right;
      delete newStyle.zIndex;
      await db.collection('pageblocks').updateOne({ _id: b._id }, { $set: { style: newStyle } });
      console.log(`    Fixed: removed fixed/sticky position`);
    }
    // Fix boxShadow missing space
    if (s.boxShadow && !s.boxShadow.includes(' ')) {
      // e.g. "2px4px" -> "2px 4px"
      const fixed = s.boxShadow.replace(/(\d+px)(\d+px)/g, '$1 $2');
      await db.collection('pageblocks').updateOne({ _id: b._id }, { $set: { 'style.boxShadow': fixed } });
      console.log(`    Fixed boxShadow: ${s.boxShadow} -> ${fixed}`);
    }
  }
  await client.close();
  console.log('Done!');
}
main().catch(e => { console.error(e.message); process.exit(1); });
