'use strict';
require('dotenv').config();
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { MongoClient } = require('mongodb');

const CLOUD_NAME  = 'wzaxevft';
const API_KEY     = '537229325423853';
const API_SECRET  = 'FFamrjUJ-E3qMzHo-jwCTTuJshc';
const MONGODB_URI = process.env.MONGODB_URI || '';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function fetchResources(nextCursor) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    // Get shophere folder only, sorted by created_at ascending (same order we uploaded)
    let p2 = `/v1_1/${CLOUD_NAME}/resources/image?max_results=500&prefix=shophere&type=upload&sort_by[]=created_at_asc`;
    if (nextCursor) p2 += `&next_cursor=${nextCursor}`;
    const req = https.request({
      hostname: 'api.cloudinary.com', port: 443, method: 'GET', path: p2,
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error(data.substring(0,300))); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n🎯 Final Cloudinary Image Fix');
  console.log('==============================\n');

  // Get all Cloudinary images in shophere folder sorted oldest first
  let cloudImages = [];
  let cursor = null;
  do {
    const result = await fetchResources(cursor);
    if (result.error) { console.error('API error:', result.error.message); process.exit(1); }
    cloudImages = cloudImages.concat(result.resources || []);
    cursor = result.next_cursor || null;
  } while (cursor);

  // Filter to shophere folder only
  cloudImages = cloudImages.filter(r => r.public_id.startsWith('shophere/'));
  // Sort by created_at ascending
  cloudImages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  console.log(`☁️  Cloudinary shophere folder: ${cloudImages.length} images`);

  // Get local files sorted by modification time (same order they were uploaded)
  const localFiles = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => ({
      name:  f,
      mtime: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => a.mtime - b.mtime);

  console.log(`📁 Local uploads folder: ${localFiles.length} images`);

  // Build mapping: local filename → cloudinary secure_url
  // They were uploaded in the same order (script uploaded them sorted by mtime)
  const fileToCloud = {};
  const min = Math.min(localFiles.length, cloudImages.length);
  for (let i = 0; i < min; i++) {
    fileToCloud[localFiles[i].name] = cloudImages[i].secure_url;
  }

  console.log(`\n🗺️  Matched ${min} local files to Cloudinary URLs\n`);
  console.log('Sample mapping:');
  Object.entries(fileToCloud).slice(0, 5).forEach(([k, v]) => {
    console.log(`  ${k} → ${v.split('/').pop()}`);
  });

  // Connect MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('\n✅ Connected to MongoDB\n');

  // Fix products — they currently have wrong Cloudinary URLs (constructed with original filename)
  // Replace with actual Cloudinary URLs matched by upload order
  const products = await db.collection('products').find({}).sort({ id: 1 }).toArray();
  let prodFixed = 0;

  for (const prod of products) {
    if (!prod.images || !prod.images.length) continue;

    const newImages = prod.images.map(img => {
      if (!img.url) return img;
      // Extract the original filename from the broken URL
      // URL is like: https://res.cloudinary.com/wzaxevft/image/upload/shophere/001b6af5-xxx.png
      const urlFilename = img.url.split('/').pop(); // e.g. "001b6af5-xxx.png"
      if (fileToCloud[urlFilename]) {
        return { ...img, url: fileToCloud[urlFilename] };
      }
      // Also try without the version tag if present
      return img;
    });

    const changed = newImages.some((img, i) => img.url !== prod.images[i].url);
    if (changed) {
      await db.collection('products').updateOne(
        { _id: prod._id },
        { $set: { images: newImages } }
      );
      prodFixed++;
      console.log(`  ✅ ${prod.name} → ${newImages[0].url.split('/').pop()}`);
    }
  }

  // Fix page blocks
  const blocks = await db.collection('pageblocks').find({}).toArray();
  for (const b of blocks) {
    if (b.type === 'image' && b.content) {
      const urlFilename = b.content.split('/').pop();
      if (fileToCloud[urlFilename]) {
        await db.collection('pageblocks').updateOne(
          { _id: b._id },
          { $set: { content: fileToCloud[urlFilename] } }
        );
        console.log(`  ✅ Page block "${b.title}": ${fileToCloud[urlFilename].split('/').pop()}`);
      }
    }
  }

  // Fix logo
  const settings = await db.collection('settings').findOne({});
  if (settings && settings.logo) {
    const urlFilename = settings.logo.split('/').pop();
    if (fileToCloud[urlFilename]) {
      await db.collection('settings').updateOne({}, { $set: { logo: fileToCloud[urlFilename] } });
      console.log(`  ✅ Store logo fixed`);
    }
  }

  console.log(`\n✅ DONE — ${prodFixed} products updated with correct Cloudinary URLs`);
  console.log('\n🌐 Refresh shophere.in to see the images!\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
