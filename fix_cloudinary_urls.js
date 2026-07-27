'use strict';
require('dotenv').config();
const https  = require('https');
const { MongoClient } = require('mongodb');

const CLOUD_NAME  = 'wzaxevft';
const API_KEY     = '537229325423853';
const API_SECRET  = 'FFamrjUJ-E3qMzHo-jwCTTuJshc';
const MONGODB_URI = process.env.MONGODB_URI || '';

// Fetch all resources from Cloudinary using Admin API
function fetchResources(nextCursor) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    let path = `/v1_1/${CLOUD_NAME}/resources/image?max_results=500&fields=secure_url,public_id,original_filename`;
    if (nextCursor) path += `&next_cursor=${nextCursor}`;

    const req = https.request({
      hostname: 'api.cloudinary.com', port: 443, method: 'GET', path,
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data.substring(0,200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 Fetching real Cloudinary URLs...');

  // Fetch all uploaded images
  let allResources = [];
  let cursor = null;
  do {
    const result = await fetchResources(cursor);
    if (result.error) { console.error('Cloudinary error:', result.error.message); process.exit(1); }
    allResources = allResources.concat(result.resources || []);
    cursor = result.next_cursor || null;
    console.log(`  Fetched ${allResources.length} images so far...`);
  } while (cursor);

  console.log(`\n✅ Found ${allResources.length} images on Cloudinary`);

  if (allResources.length === 0) {
    console.log('❌ No images found on Cloudinary. The upload may have failed.');
    return;
  }

  // Show first few URLs to understand the pattern
  console.log('\nSample URLs:');
  allResources.slice(0, 5).forEach(r => {
    console.log(`  public_id: ${r.public_id}`);
    console.log(`  url:       ${r.secure_url}\n`);
  });

  // Build map: basename (uuid) → actual secure_url
  const urlMap = {};
  for (const r of allResources) {
    // public_id could be: "shophere/uuid-name" or just "uuid-name"
    const parts    = r.public_id.split('/');
    const basename = parts[parts.length - 1]; // last part = filename without extension
    urlMap[basename] = r.secure_url;

    // Also map with extension variants
    const fullName = r.secure_url.split('/').pop(); // e.g. "abc123.jpg"
    urlMap[fullName] = r.secure_url;
  }

  console.log(`\n🗺️  Built URL map with ${Object.keys(urlMap).length} entries`);

  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('✅ Connected to MongoDB\n');

  // Fix products
  const products = await db.collection('products').find({}).toArray();
  let prodFixed = 0;

  for (const prod of products) {
    if (!prod.images || !prod.images.length) continue;

    let changed = false;
    const newImages = prod.images.map(img => {
      if (!img.url) return img;
      if (img.url.includes('cloudinary.com') && !img.url.includes('404')) {
        // Verify this URL is actually in our map — if not, try to fix it
        const fname = img.url.split('/').pop().split('.')[0]; // uuid part
        if (urlMap[fname]) {
          // URL exists and is valid
          return img;
        }
      }

      // Extract the UUID filename from any URL format
      let key = null;
      if (img.url.startsWith('/uploads/')) {
        key = img.url.replace('/uploads/', '').split('.')[0]; // remove extension
      } else if (img.url.includes('cloudinary.com')) {
        key = img.url.split('/').pop().split('.')[0];
      } else if (img.url.startsWith('http')) {
        key = img.url.split('/').pop().split('.')[0];
      }

      if (key && urlMap[key]) {
        changed = true;
        return { ...img, url: urlMap[key] };
      }

      // Try with extension
      const fullKey = img.url.split('/').pop();
      if (fullKey && urlMap[fullKey]) {
        changed = true;
        return { ...img, url: urlMap[fullKey] };
      }

      return img;
    });

    if (changed) {
      await db.collection('products').updateOne(
        { _id: prod._id },
        { $set: { images: newImages } }
      );
      prodFixed++;
      console.log(`  ✅ Fixed: ${prod.name}`);
    }
  }

  // Fix page blocks
  const blocks = await db.collection('pageblocks').find({}).toArray();
  let blocksFixed = 0;
  for (const b of blocks) {
    if (b.type === 'image' && b.content) {
      let key = null;
      if (b.content.startsWith('/uploads/')) key = b.content.replace('/uploads/','').split('.')[0];
      else if (b.content.includes('cloudinary.com')) key = b.content.split('/').pop().split('.')[0];

      if (key && urlMap[key]) {
        await db.collection('pageblocks').updateOne(
          { _id: b._id },
          { $set: { content: urlMap[key] } }
        );
        blocksFixed++;
        console.log(`  ✅ Fixed page block: ${b.title}`);
      }
    }
  }

  // Fix logo
  const settings = await db.collection('settings').findOne({});
  if (settings && settings.logo) {
    let key = null;
    if (settings.logo.startsWith('/uploads/')) key = settings.logo.replace('/uploads/','').split('.')[0];
    else if (settings.logo.includes('cloudinary.com')) key = settings.logo.split('/').pop().split('.')[0];
    if (key && urlMap[key]) {
      await db.collection('settings').updateOne({}, { $set: { logo: urlMap[key] } });
      console.log(`  ✅ Fixed store logo`);
    }
  }

  console.log(`\n✅ DONE!`);
  console.log(`   ${prodFixed} products fixed`);
  console.log(`   ${blocksFixed} page blocks fixed`);

  if (prodFixed === 0) {
    console.log('\n⚠️  No products were fixed. This means either:');
    console.log('   1. The image UUIDs in the database do not match any Cloudinary image');
    console.log('   2. Or all products already have correct URLs');
    console.log('\n📋 Database image URLs (first 5 products):');
    for (const prod of products.slice(0, 5)) {
      if (prod.images && prod.images.length) {
        console.log(`  ${prod.name}: ${prod.images[0].url}`);
      }
    }
    console.log('\n📋 Cloudinary image public_ids (first 10):');
    allResources.slice(0, 10).forEach(r => console.log(`  ${r.public_id} → ${r.secure_url}`));
  }

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
