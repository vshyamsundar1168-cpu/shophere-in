/**
 * One-time migration: imports data/*.json → MongoDB Atlas
 * Run once with: node migrate.js
 */
require('dotenv').config();
'use strict';
const fs   = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_DIR = path.join(__dirname, 'data');

function load(file) {
  try {
    const txt = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').trim();
    return txt ? JSON.parse(txt) : null;
  } catch(e) {
    console.warn(`[SKIP] ${file} not found or invalid:`, e.message);
    return null;
  }
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('shophere');
  console.log('Connected.\n');

  // ── Products ──────────────────────────────────────────────────────────────
  const products = load('products.json');
  if (products && products.length) {
    await db.collection('products').deleteMany({});
    await db.collection('products').insertMany(products);
    console.log(`✅ Products: ${products.length} inserted`);
  }

  // ── Categories ────────────────────────────────────────────────────────────
  const cats = load('categories.json');
  if (cats && cats.length) {
    await db.collection('categories').deleteMany({});
    await db.collection('categories').insertMany(cats.map(name => ({ name })));
    console.log(`✅ Categories: ${cats.length} inserted`);
  }

  // ── Banners ───────────────────────────────────────────────────────────────
  const banners = load('banners.json');
  if (banners && banners.length) {
    await db.collection('banners').deleteMany({});
    await db.collection('banners').insertMany(banners);
    console.log(`✅ Banners: ${banners.length} inserted`);
  }

  // ── Settings ──────────────────────────────────────────────────────────────
  const settings = load('settings.json');
  if (settings) {
    await db.collection('settings').deleteMany({});
    await db.collection('settings').insertOne(settings);
    console.log('✅ Settings inserted');
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  const orders = load('orders.json');
  if (orders && orders.length) {
    await db.collection('orders').deleteMany({});
    await db.collection('orders').insertMany(orders);
    console.log(`✅ Orders: ${orders.length} inserted`);
  } else {
    console.log('ℹ️  Orders: empty, skipped');
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  const reviews = load('reviews.json');
  if (reviews && typeof reviews === 'object') {
    const docs = Object.entries(reviews)
      .filter(([, revArr]) => revArr && revArr.length)
      .map(([productId, revs]) => ({ productId, reviews: revs }));
    if (docs.length) {
      await db.collection('reviews').deleteMany({});
      await db.collection('reviews').insertMany(docs);
      console.log(`✅ Reviews: ${docs.length} product(s) with reviews inserted`);
    } else {
      console.log('ℹ️  Reviews: empty, skipped');
    }
  }

  await client.close();
  console.log('\n🎉 Migration complete! Restart the server: node server.js');
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
