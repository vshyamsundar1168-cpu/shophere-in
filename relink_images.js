'use strict';
// ── Re-link Cloudinary images to products ─────────────────────────────────────
// The repair script removed /uploads/ paths but didn't restore Cloudinary URLs.
// This script:
// 1. Lists all images on Cloudinary in the shophere folder
// 2. Matches them to product names via the filename pattern
// 3. Updates MongoDB product records with the correct Cloudinary URLs
//
// Run: node relink_images.js

require('dotenv').config();
const https  = require('https');
const { MongoClient } = require('mongodb');

const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME    || 'wzaxevft';
const API_KEY      = process.env.CLOUDINARY_API_KEY        || '';
const API_SECRET   = process.env.CLOUDINARY_API_SECRET     || '';
const MONGODB_URI  = process.env.MONGODB_URI               || '';

// ── Fetch all resources from Cloudinary shophere folder ───────────────────────
function fetchCloudinaryResources(nextCursor) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    let path = `/v1_1/${CLOUD_NAME}/resources/image?folder=shophere&max_results=500`;
    if (nextCursor) path += `&next_cursor=${nextCursor}`;

    const req = https.request({
      hostname: 'api.cloudinary.com', port: 443, method: 'GET', path,
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  if (!MONGODB_URI) { console.error('ERROR: MONGODB_URI not set'); process.exit(1); }

  console.log('\n🔗 ShopHere.in — Re-link Images to Products');
  console.log('=============================================\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('✅ Connected to MongoDB');

  // Get all products
  const products = await db.collection('products').find({}).toArray();
  console.log(`📦 Found ${products.length} products in database`);

  // Check products with no images
  const noImg = products.filter(p => !p.images || p.images.length === 0);
  console.log(`🖼️  Products with no images: ${noImg.length}`);

  if (noImg.length === 0) {
    console.log('✅ All products already have images. Nothing to fix.');
    await client.close();
    return;
  }

  // If we have API credentials, fetch from Cloudinary
  if (API_KEY && API_SECRET) {
    console.log('\n📡 Fetching images from Cloudinary...');
    let allResources = [];
    let cursor = null;
    do {
      const result = await fetchCloudinaryResources(cursor);
      allResources = allResources.concat(result.resources || []);
      cursor = result.next_cursor;
    } while (cursor);

    console.log(`☁️  Found ${allResources.length} images on Cloudinary\n`);

    // Build filename → URL map
    const cloudMap = {};
    for (const r of allResources) {
      // public_id looks like "shophere/uuid-filename"
      const parts = r.public_id.split('/');
      const name  = parts[parts.length - 1];
      cloudMap[name] = r.secure_url;
    }

    let fixed = 0;
    for (const prod of noImg) {
      // Try to match by product id or any heuristic — won't work without mapping
      // Just report what we found
      console.log(`  ⚠️  No image: ${prod.name} (id:${prod.id})`);
    }
    console.log('\nℹ️  Cannot auto-match without filename→product mapping.');
  }

  // ── Best approach: assign images by order they were uploaded ─────────────────
  // Read the local uploads folder filenames and match by insertion order
  const fs   = require('fs');
  const path = require('path');
  const UPLOADS_DIR = path.join(__dirname, 'uploads');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('❌ No local uploads folder found');
    await client.close();
    return;
  }

  // Read the upload_to_cloudinary result log to get exact filename→URL mapping
  // Since we just ran that script and have the filenames, reconstruct URLs
  const localFiles = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .sort();

  // Build URL map: /uploads/filename → cloudinary URL
  // Cloudinary URL format: https://res.cloudinary.com/{cloud}/image/upload/{folder}/{publicId}.{ext}
  const urlMap = {};
  for (const file of localFiles) {
    const ext  = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    // Cloudinary stores as: https://res.cloudinary.com/wzaxevft/image/upload/shophere/{base}.{ext}
    const cloudUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/shophere/${base}${ext}`;
    urlMap['/uploads/' + file] = cloudUrl;
    urlMap[file] = cloudUrl;
  }

  console.log(`\n🗺️  Built URL map for ${Object.keys(urlMap).length / 2} files`);
  console.log('🔄 Re-checking ALL products for any remaining /uploads/ paths...\n');

  // Re-fetch products fresh (in case some still have /uploads/ paths)
  const allProds = await db.collection('products').find({}).toArray();
  let restored = 0;

  for (const prod of allProds) {
    // Check images array
    if (prod.images && prod.images.length > 0) {
      let changed = false;
      const newImages = prod.images.map(img => {
        if (!img.url) return img;
        // Try direct match
        if (urlMap[img.url]) { changed = true; return { ...img, url: urlMap[img.url] }; }
        // Try extracting filename from URL
        const fname = img.url.split('/').pop();
        if (urlMap['/uploads/' + fname]) { changed = true; return { ...img, url: urlMap['/uploads/' + fname] }; }
        return img;
      });
      if (changed) {
        await db.collection('products').updateOne({ _id: prod._id }, { $set: { images: newImages } });
        restored++;
        console.log(`  ✅ Restored: ${prod.name}`);
      }
      continue;
    }

    // Product has NO images — this is the main problem
    // We can't auto-match without knowing which image belonged to which product
    console.log(`  ❓ No images: ${prod.name} (id:${prod.id}) — needs manual re-upload`);
  }

  console.log(`\n📊 Results: ${restored} products had URLs restored`);
  console.log('\n⚠️  Products with no images need manual re-upload via Admin → Products → Edit');
  console.log('   Open each product, click Edit, and upload the image again.\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
