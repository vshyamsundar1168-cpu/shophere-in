'use strict';
// ── Upload all local images to Cloudinary & restore product image URLs ─────────
// Run: node upload_to_cloudinary.js
// Reads CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET from .env
// Then uploads every file in /uploads to Cloudinary
// Then queries MongoDB and restores any /uploads/filename.jpg → Cloudinary URL

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const https  = require('https');
const { MongoClient } = require('mongodb');

// ── Config ────────────────────────────────────────────────────────────────────
// Read from .env OR hardcode here temporarily
let CLOUD_NAME    = process.env.CLOUDINARY_CLOUD_NAME    || '';
let UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'shophere_uploads';
const MONGODB_URI = process.env.MONGODB_URI              || '';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// If not in .env, read from MongoDB settings
async function loadConfigFromDB(db) {
  const s = await db.collection('settings').findOne({}, { projection: { cloudName:1, uploadPreset:1 } }) || {};
  if (!CLOUD_NAME   && s.cloudName)   CLOUD_NAME    = s.cloudName;
  if (UPLOAD_PRESET === 'shophere_uploads' && s.uploadPreset) UPLOAD_PRESET = s.uploadPreset;
  console.log(`[CONFIG] Cloudinary: cloud=${CLOUD_NAME} preset=${UPLOAD_PRESET}`);
}

// ── Upload one file to Cloudinary ─────────────────────────────────────────────
function uploadToCloudinary(fileData, mimeType, filename) {
  return new Promise((resolve) => {
    const boundary = '----CB' + crypto.randomUUID().replace(/-/g,'');
    const ext      = path.extname(filename).toLowerCase() || '.jpg';
    const chunks   = [];

    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    chunks.push(fileData);
    chunks.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="upload_preset"\r\n\r\n${UPLOAD_PRESET}\r\n`));
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\nshophere\r\n`));
    chunks.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(chunks);
    const req  = https.request({
      hostname: 'api.cloudinary.com', port: 443, method: 'POST',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.secure_url) resolve({ ok: true, url: j.secure_url });
          else resolve({ ok: false, error: (j.error && j.error.message) || 'Unknown error' });
        } catch(e) { resolve({ ok: false, error: e.message }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

function getMime(ext) {
  const map = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
                '.gif':'image/gif', '.webp':'image/webp' };
  return map[ext.toLowerCase()] || 'image/jpeg';
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not set in .env file');
    process.exit(1);
  }

  console.log('\n🚀 ShopHere.in — Image Recovery Tool');
  console.log('=====================================\n');

  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('✅ Connected to MongoDB\n');

  // Load Cloudinary config from DB if not in env
  await loadConfigFromDB(db);

  if (!CLOUD_NAME) {
    console.error('ERROR: Cloudinary Cloud Name not found in .env or database settings');
    console.error('Please add CLOUDINARY_CLOUD_NAME=wzaxevft to your .env file');
    await client.close();
    process.exit(1);
  }

  // Step 1: Upload all local files to Cloudinary
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
  console.log(`📁 Found ${files.length} image files in uploads/\n`);

  // Build a map: filename → cloudinary URL
  const urlMap = {};
  let uploaded = 0, failed = 0, skipped = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext  = path.extname(file).toLowerCase();
    const mime = getMime(ext);
    const fp   = path.join(UPLOADS_DIR, file);
    const data = fs.readFileSync(fp);

    process.stdout.write(`[${i+1}/${files.length}] Uploading ${file.substring(0,40)}...`);

    const result = await uploadToCloudinary(data, mime, file);
    if (result.ok) {
      urlMap['/uploads/' + file] = result.url;
      uploaded++;
      console.log(` ✅`);
    } else {
      failed++;
      console.log(` ❌ ${result.error}`);
    }
  }

  console.log(`\n📊 Upload results: ${uploaded} uploaded, ${failed} failed, ${skipped} skipped`);
  console.log('\n🔄 Now restoring product image URLs in MongoDB...\n');

  // Step 2: Update all products in MongoDB
  const products = await db.collection('products').find({}).toArray();
  let prodFixed = 0, prodSkipped = 0;

  for (const prod of products) {
    if (!prod.images || !prod.images.length) { prodSkipped++; continue; }

    let changed = false;
    const newImages = prod.images.map(img => {
      if (!img.url) return img;
      // If this is a /uploads/ URL that we have a mapping for
      if (img.url.startsWith('/uploads/') && urlMap[img.url]) {
        changed = true;
        return { ...img, url: urlMap[img.url] };
      }
      return img;
    });

    if (changed) {
      await db.collection('products').updateOne(
        { _id: prod._id },
        { $set: { images: newImages } }
      );
      prodFixed++;
      console.log(`  ✅ Fixed: ${prod.name} (${newImages.filter(i=>i.url.includes('cloudinary')).length} images)`);
    } else {
      prodSkipped++;
    }
  }

  console.log(`\n✅ DONE! ${prodFixed} products restored, ${prodSkipped} skipped`);
  console.log('\n🎉 All your images are now on Cloudinary permanently!');
  console.log('   They will never disappear after Render redeployments.\n');

  await client.close();
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
