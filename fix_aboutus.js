'use strict';
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '';
const CLOUD_NAME  = process.env.CLOUDINARY_CLOUD_NAME || 'wzaxevft';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // Fix About Us image block — /uploads/25fdb462... → Cloudinary URL
  const oldUrl = '/uploads/25fdb462-27a3-44f5-9ecf-cba51798a0d3.jpg';
  const newUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/shophere/25fdb462-27a3-44f5-9ecf-cba51798a0d3.jpg`;

  const r1 = await db.collection('pageblocks').updateOne(
    { content: oldUrl },
    { $set: { content: newUrl } }
  );
  console.log('About Us image block:', r1.modifiedCount ? '✅ Fixed' : '⚠️ Not found or already fixed');

  // Also fix logo in settings
  const r2 = await db.collection('settings').updateOne(
    { logo: oldUrl },
    { $set: { logo: newUrl } }
  );
  console.log('Store logo:', r2.modifiedCount ? '✅ Fixed' : '⚠️ Not found or already fixed');

  // Fix any other pageblocks with /uploads/ paths
  const blocks = await db.collection('pageblocks').find({}).toArray();
  let fixed = 0;
  for (const b of blocks) {
    if (b.content && b.content.startsWith('/uploads/')) {
      const fname    = b.content.replace('/uploads/', '');
      const cloudUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/shophere/${fname}`;
      await db.collection('pageblocks').updateOne(
        { _id: b._id },
        { $set: { content: cloudUrl } }
      );
      fixed++;
      console.log(`✅ Fixed page block: ${b.title} → ${cloudUrl}`);
    }
  }
  if (!fixed) console.log('No other broken page block images found');

  console.log('\n✅ All done!');
  await client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
