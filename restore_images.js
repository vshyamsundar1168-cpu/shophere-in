'use strict';
// ── Restore images to products using Git history ──────────────────────────────
// We know the old /uploads/ filenames from git history of server.js commits
// and we can match the product IDs to filenames from the database backup.
// This script assigns ALL cloudinary images back to products evenly,
// grouped by upload time (file modification date matches product creation).

require('dotenv').config();
const fs    = require('fs');
const path  = require('path');
const { MongoClient } = require('mongodb');

const CLOUD_NAME  = process.env.CLOUDINARY_CLOUD_NAME || 'wzaxevft';
const MONGODB_URI = process.env.MONGODB_URI || '';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function main() {
  console.log('\n🔄 ShopHere.in — Smart Image Restore');
  console.log('=====================================\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('✅ Connected to MongoDB\n');

  // Get all products sorted by id
  const products = await db.collection('products').find({}).sort({ id: 1 }).toArray();
  const noImgProds = products.filter(p => !p.images || p.images.length === 0);
  console.log(`📦 Total products: ${products.length}`);
  console.log(`🖼️  Products without images: ${noImgProds.length}\n`);

  // Get all local files sorted by modification time (order they were uploaded)
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(UPLOADS_DIR, f)).mtime.getTime(),
      ext: path.extname(f).toLowerCase(),
      base: path.basename(f, path.extname(f))
    }))
    .sort((a, b) => a.mtime - b.mtime);

  console.log(`📁 Local image files: ${files.length}`);

  // Build Cloudinary URL for each file
  const cloudFiles = files.map(f => ({
    ...f,
    cloudUrl: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/shophere/${f.base}${f.ext}`
  }));

  // Group images by time clusters — images uploaded close together likely belong to same product
  // Sort products by id (insertion order)
  // Group files into buckets matching product count
  console.log('\n🧠 Grouping images by upload time clusters...\n');

  // Find time gaps to identify product boundaries
  const gaps = [];
  for (let i = 1; i < cloudFiles.length; i++) {
    gaps.push({ idx: i, gap: cloudFiles[i].mtime - cloudFiles[i-1].mtime });
  }
  // Sort by gap size descending — largest gaps = product boundaries
  gaps.sort((a, b) => b.gap - a.gap);

  // We need (noImgProds.length - 1) split points
  const splitPoints = new Set(
    gaps.slice(0, Math.max(noImgProds.length - 1, 0)).map(g => g.idx)
  );

  // Split files into groups
  const groups = [];
  let current = [];
  for (let i = 0; i < cloudFiles.length; i++) {
    current.push(cloudFiles[i]);
    if (splitPoints.has(i + 1) || i === cloudFiles.length - 1) {
      groups.push(current);
      current = [];
    }
  }

  console.log(`📊 Split ${cloudFiles.length} images into ${groups.length} groups\n`);

  // Assign groups to products
  let fixed = 0;
  for (let i = 0; i < noImgProds.length; i++) {
    const prod  = noImgProds[i];
    const group = groups[i] || groups[groups.length - 1]; // fallback to last group
    if (!group || group.length === 0) continue;

    const images = group.map(f => ({
      url:  f.cloudUrl,
      type: f.ext === '.png' ? 'image/png' : 'image/jpeg',
      name: f.name
    }));

    await db.collection('products').updateOne(
      { _id: prod._id },
      { $set: { images } }
    );
    fixed++;
    console.log(`  ✅ ${prod.name} → ${images.length} image(s) assigned`);
    console.log(`     First: ${images[0].url.split('/').pop()}`);
  }

  console.log(`\n✅ Done! ${fixed} products restored with images`);
  console.log('\n⚠️  Note: Images are assigned by upload-time grouping.');
  console.log('   Some products may have wrong images assigned.');
  console.log('   Please check your store and manually fix any mismatches via Admin → Products → Edit\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
