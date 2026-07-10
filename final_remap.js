'use strict';
// ── Definitive Image-to-Product Mapping ───────────────────────────────────────
// Uses the actual product names and image group sizes to manually assign images
// Based on analysis from smart_remap.js output:
//
// Products sorted by id (creation order):
// 13 - Soft Banarasi Silk Saree (1 img group)
// 14 - READY TO WEAR 1 MIN SAREE (1 img group)
// 15 - Heavy Dull Masshmellow Saree (1 img group)
// 16 - Kanchipuram Organza Sarees (1 img group)
// 17 - Imported Bruising check Shirts (13 img group — multi-color shirt)
// 18 - Heavy Jira Surgery pattern (1 img group)
// 19 - 4 item set Night dress (1 img group)
// 20 - VICHITRA SILK MULTI WORK MATERIALS (1 img)
// 21 - Soft Dola Silk Saree (1 img)
// 22 - Soft Dola Silk Saree (another) (1 img)
// 23 - Co Ord Set (1 img)
// 24 - 4 item set (2 img)
// 25 - Functions and Party wear Kurtas
// 26 - DESIGNER KURTA PAIJAMA (9 imgs)
// 27 - Imported RFD Back Print Shirt
// 28 - Lacoste Checks
// 29 - Men's Solid Full Sleeve Mandarin
// 30 - Men's Solid Double Pocket Shirts
// 31 - SLUB COTTON TIE WORK MATERIAL
// 32 - VICHITRA SILK WITH MULTI ALLOVER
// 33 - Elegant Linen Saree
// 34 - Digital Print And Fancy Latkan Saree
// 36 - Super Premium Marshmallow Digital
// 37 - Jaipuri Printed Cotton Mulmul
// 38 - Tim Tim hand bag
// 39 - Rattan Potli
// 40 - KALAMKARI DESIGNER
// 41 - SHIBORI KALAMKARI SAREE

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
  console.log('\n🎯 Definitive Image-to-Product Mapping');
  console.log('========================================\n');

  // Get Cloudinary resources
  const cloudResult = await fetchCloudResources();
  const cloudImages = (cloudResult.resources || [])
    .filter(r => r.public_id.startsWith('shophere/'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Get local files sorted by mtime
  const localFiles = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => ({
      name:  f,
      mtime: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => a.mtime - b.mtime);

  // Build local filename → Cloudinary URL map
  const fileToCloud = {};
  const min = Math.min(localFiles.length, cloudImages.length);
  for (let i = 0; i < min; i++) {
    fileToCloud[localFiles[i].name] = cloudImages[i].secure_url;
  }

  // Build groups (gap > 30 sec = new group)
  const GAP = 30 * 1000;
  const groups = [];
  let cur = [localFiles[0]];
  for (let i = 1; i < localFiles.length; i++) {
    if (localFiles[i].mtime - localFiles[i-1].mtime > GAP) {
      groups.push(cur); cur = [localFiles[i]];
    } else { cur.push(localFiles[i]); }
  }
  groups.push(cur);

  // Convert groups to Cloudinary URL arrays
  const groupUrls = groups.map(g =>
    g.map(f => fileToCloud[f.name]).filter(Boolean)
      .map(url => ({ url, type: url.match(/\.(png|gif)/) ? 'image/png' : 'image/jpeg', name: 'remapped' }))
  );

  console.log(`📊 ${groupUrls.length} image groups from ${localFiles.length} files`);

  // Connect MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // Get products sorted by id
  const products = await db.collection('products').find({}).sort({ id: 1 }).toArray();
  console.log(`📦 ${products.length} products in database\n`);

  // Get product creation times from MongoDB _id (ObjectId contains timestamp)
  // Sort products by their MongoDB _id (which encodes creation time)
  const prodsWithTime = products.map(p => ({
    ...p,
    createTime: p._id.getTimestamp ? p._id.getTimestamp().getTime() : 0
  })).sort((a, b) => a.createTime - b.createTime);

  // Now match: products are sorted by creation time, groups are sorted by upload time
  // Products were created BEFORE their images were uploaded (product first, then add images)
  // So product[0] → group with earliest upload time, etc.
  // But we need to handle: one product can have multiple image groups uploaded at different times

  // Better approach: match by proximity of creation time to group upload time
  // Each product gets the group whose upload time is closest AFTER product creation

  console.log('🔗 Matching products to image groups by time proximity:\n');

  const used = new Set();
  const assignments = [];

  for (const prod of prodsWithTime) {
    const prodTime = prod.createTime;

    // Find the first unused group uploaded AFTER this product was created
    // or the closest one overall
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let gi = 0; gi < groupUrls.length; gi++) {
      if (used.has(gi) || groupUrls[gi].length === 0) continue;
      const groupTime = groups[gi][0].mtime;
      const diff = groupTime - prodTime; // positive = after product creation
      const score = diff >= 0 ? diff : Math.abs(diff) * 10; // penalise uploads before product
      if (score < bestScore) { bestScore = score; bestIdx = gi; }
    }

    if (bestIdx >= 0) {
      used.add(bestIdx);
      assignments.push({ prod, groupIdx: bestIdx, urls: groupUrls[bestIdx] });
    } else {
      assignments.push({ prod, groupIdx: -1, urls: [] });
    }
  }

  // Apply assignments
  let fixed = 0;
  for (const { prod, groupIdx, urls } of assignments) {
    if (urls.length === 0) {
      console.log(`  ⚠️  ${prod.name.substring(0,50)} — no images found`);
      continue;
    }
    await db.collection('products').updateOne(
      { _id: prod._id },
      { $set: { images: urls } }
    );
    fixed++;
    const t = groups[groupIdx][0].mtime;
    console.log(`  ✅ [${prod.id}] ${prod.name.substring(0,44).padEnd(44)} ← ${urls.length} img @ ${new Date(t).toLocaleTimeString('en-IN')}`);
  }

  console.log(`\n✅ Done! ${fixed} products updated`);
  console.log('\n🌐 Hard refresh shophere.in — images should now be in the right places!');
  console.log('   Any remaining mismatches → Admin → Products → 🖼️ Images → drag/move\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
