'use strict';
// ── Smart Image-to-Product Re-mapping ─────────────────────────────────────────
// Logic:
// 1. Get all products from MongoDB with their creation dates
// 2. Get all local image files with their modification times
// 3. For each product, find images whose mtime is close to the product's importedAt/creation time
// 4. Use the Cloudinary URL mapping (from fix_cloudinary_final) to get real URLs
// 5. Update MongoDB with the correct assignment

require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { MongoClient } = require('mongodb');

const CLOUD_NAME  = 'wzaxevft';
const API_KEY     = '537229325423853';
const API_SECRET  = 'FFamrjUJ-E3qMzHo-jwCTTuJshc';
const MONGODB_URI = process.env.MONGODB_URI || '';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function fetchCloudResources() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    const p2 = `/v1_1/${CLOUD_NAME}/resources/image?max_results=500&prefix=shophere&type=upload`;
    const req = https.request({
      hostname: 'api.cloudinary.com', port: 443, method: 'GET', path: p2,
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n🧠 Smart Image-to-Product Re-mapping');
  console.log('=====================================\n');

  // Get Cloudinary resources
  const cloudResult = await fetchCloudResources();
  const cloudImages = (cloudResult.resources || [])
    .filter(r => r.public_id.startsWith('shophere/'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  console.log(`☁️  Cloudinary: ${cloudImages.length} images in shophere folder`);

  // Get local files sorted by mtime
  const localFiles = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => ({
      name:  f,
      mtime: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.getTime(),
      ctime: fs.statSync(path.join(UPLOADS_DIR, f)).ctime.getTime()
    }))
    .sort((a, b) => a.mtime - b.mtime);
  console.log(`📁 Local uploads: ${localFiles.length} images\n`);

  // Build local filename → Cloudinary URL map (by sorted upload order)
  const min = Math.min(localFiles.length, cloudImages.length);
  const fileToCloud = {};
  for (let i = 0; i < min; i++) {
    fileToCloud[localFiles[i].name] = cloudImages[i].secure_url;
  }

  // Connect MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // Get products sorted by id (insertion order = creation order)
  const products = await db.collection('products').find({}).sort({ id: 1 }).toArray();
  console.log(`📦 Products in database: ${products.length}\n`);

  // Print current state — show product name, id, and first image URL
  console.log('Current product → image mapping:');
  console.log('─'.repeat(80));
  for (const p of products) {
    const img1 = p.images && p.images.length ? p.images[0].url.split('/').pop() : '(none)';
    console.log(`  [${String(p.id).padStart(2)}] ${p.name.substring(0,45).padEnd(45)} → ${img1}`);
  }
  console.log('─'.repeat(80));

  // Show local files with timestamps for manual inspection
  console.log('\nLocal image files sorted by modification time:');
  console.log('─'.repeat(80));
  localFiles.forEach((f, i) => {
    const d = new Date(f.mtime);
    const cloudUrl = fileToCloud[f.name] || '(no match)';
    const cloudId  = cloudUrl.split('/').pop();
    console.log(`  [${String(i+1).padStart(2)}] ${f.name.substring(0,44).padEnd(44)} ${d.toLocaleString('en-IN')} → ${cloudId}`);
  });
  console.log('─'.repeat(80));

  // Group images by time gap — find natural clusters
  console.log('\n📊 Image time clusters (gaps > 30 seconds = new product batch):');
  const GAP_THRESHOLD = 30 * 1000; // 30 seconds
  let groups = [];
  let currentGroup = [localFiles[0]];

  for (let i = 1; i < localFiles.length; i++) {
    const gap = localFiles[i].mtime - localFiles[i-1].mtime;
    if (gap > GAP_THRESHOLD) {
      groups.push(currentGroup);
      currentGroup = [localFiles[i]];
    } else {
      currentGroup.push(localFiles[i]);
    }
  }
  groups.push(currentGroup);

  console.log(`\n  Found ${groups.length} image groups:\n`);
  groups.forEach((g, i) => {
    const t = new Date(g[0].mtime).toLocaleString('en-IN');
    const cloudUrls = g.map(f => fileToCloud[f.name] || '').filter(Boolean);
    const ids = cloudUrls.map(u => u.split('/').pop().substring(0, 12));
    console.log(`  Group ${i+1} (${g.length} image${g.length>1?'s':''}) @ ${t}`);
    g.forEach(f => {
      const cu = fileToCloud[f.name] ? fileToCloud[f.name].split('/').pop() : '(no cloudinary)';
      console.log(`    - ${f.name.substring(0,44)} → ${cu}`);
    });
    console.log();
  });

  // Now assign groups to products (sorted by id)
  // Products without images first, then match by count
  const noImgProds = products.filter(p => !p.images || p.images.length === 0);
  const withImgProds = products.filter(p => p.images && p.images.length > 0);

  console.log(`\n  Products with no images: ${noImgProds.length}`);
  console.log(`  Products with images: ${withImgProds.length}`);
  console.log(`  Image groups: ${groups.length}`);

  if (groups.length === 0) {
    console.log('\n❌ No image groups found');
    await client.close();
    return;
  }

  // Assign groups to products that currently have no images
  // (products with images may have wrong ones but at least have something)
  console.log('\n🔄 Proposed reassignment (groups → products without images):');
  console.log('─'.repeat(80));

  const allProdsById = {};
  products.forEach(p => allProdsById[p.id] = p);

  // Match each group to the corresponding product (by order)
  // Re-assign ALL products using groups
  const sortedProds = [...products].sort((a, b) => a.id - b.id);

  let updated = 0;
  for (let i = 0; i < sortedProds.length && i < groups.length; i++) {
    const prod  = sortedProds[i];
    const group = groups[i];
    const newImages = group
      .map(f => fileToCloud[f.name])
      .filter(Boolean)
      .map(url => ({ url, type: url.includes('.png') ? 'image/png' : 'image/jpeg', name: 'remapped' }));

    if (newImages.length === 0) continue;

    const currentFirst = prod.images && prod.images.length ? prod.images[0].url.split('/').pop().substring(0,12) : '(none)';
    const newFirst = newImages[0].url.split('/').pop().substring(0,12);
    console.log(`  [${prod.id}] ${prod.name.substring(0,40).padEnd(40)} : ${currentFirst} → ${newFirst} (${newImages.length} img${newImages.length>1?'s':''})`);

    await db.collection('products').updateOne(
      { _id: prod._id },
      { $set: { images: newImages } }
    );
    updated++;
  }

  console.log(`\n✅ Updated ${updated} products with time-based image groups`);
  console.log('\n⚠️  Please check your store — images are now assigned by upload time order.');
  console.log('   Use Admin → Products → 🖼️ Images to drag/move any still-misplaced images.\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
