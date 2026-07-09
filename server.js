require('dotenv').config();
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { connectDB, getDb } = require('./db');

const PORT       = process.env.PORT || 8080;
const BASE_DIR   = __dirname;
const UPLOAD_DIR = path.join(BASE_DIR, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── MIME ──────────────────────────────────────────────────────────────────────
const MIME_MAP = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.webp':'image/webp','.mp4':'video/mp4',
  '.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav',
  '.ogg':'audio/ogg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
};
const EXT_TO_MIME = {
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml',
  '.mp4':'video/mp4','.webm':'video/webm',
  '.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg',
};

// ── Default data ──────────────────────────────────────────────────────────────
const DEF_SETTINGS = {
  storeName: 'ShopHere.in', logo: '', primaryColor: '#f97316',
  announcementBar: 'Free shipping on orders above ₹999',
  scrollingText: 'Welcome to ShopHere.in 🛍️  |  Delivery at your doorstep 🚚  |  We maintain quality products with reasonable price ✅',
  contactEmail: '', contactPhone: '', contactAddress: '',
  freeShippingThreshold: 999, footerText: '',
  termsAndConditions: 'These are the terms and conditions for ShopHere.in. By using this website you agree to our terms.',
  privacyPolicy: 'We respect your privacy. Your personal information is kept safe and never shared with third parties.',
  returnPolicy: '', faqText: '',
  adminUsername: 'admin', adminPassword: 'admin123',
  bannerHeight: 380, bannerTextSize: 'large',
  bodyTextColor: '#1e293b', headingColor: '#1e293b', linkColor: '#f97316'
};

const DEF_CATS    = ['Electronics','Fashion','Kitchen','Sports','Beauty','Books','Toys','Home'];

const DEF_BANNERS = [
  { id:1, bgGradient:'linear-gradient(135deg,#1e293b,#f97316)', bgImage:'',
    headline:'Welcome to ShopHere.in 🛍️', subtitle:"India's favourite online store",
    ctaLabel:'Shop Now', ctaUrl:'#', active:true },
];

const DEF_PRODUCTS = [
  {id:1,name:'Samsung Galaxy S24',brand:'Samsung',category:'Electronics',price:64999,originalPrice:79999,rating:4.5,reviewCount:1240,stock:50,badge:'deal',featured:true,images:[],videos:[],audios:[],description:'Latest Samsung flagship with AI features.'},
  {id:2,name:'Nike Air Max 270',brand:'Nike',category:'Fashion',price:7999,originalPrice:11999,rating:4.3,reviewCount:856,stock:30,badge:'new',featured:true,images:[],videos:[],audios:[],description:'Comfortable running shoes with air cushion.'},
  {id:3,name:'Instant Pot Duo 7-in-1',brand:'Instant Pot',category:'Kitchen',price:5499,originalPrice:7999,rating:4.7,reviewCount:2105,stock:20,badge:'hot',featured:false,images:[],videos:[],audios:[],description:'7-in-1 electric pressure cooker.'},
  {id:4,name:'Sony WH-1000XM5',brand:'Sony',category:'Electronics',price:24999,originalPrice:34999,rating:4.8,reviewCount:3200,stock:15,badge:'deal',featured:true,images:[],videos:[],audios:[],description:'Industry-leading noise cancelling headphones.'},
  {id:5,name:"Levi's 501 Jeans",brand:"Levi's",category:'Fashion',price:2999,originalPrice:4999,rating:4.2,reviewCount:650,stock:80,badge:'',featured:false,images:[],videos:[],audios:[],description:'Classic straight fit jeans.'},
  {id:6,name:'Prestige Induction Cooktop',brand:'Prestige',category:'Kitchen',price:2299,originalPrice:3499,rating:4.1,reviewCount:420,stock:40,badge:'new',featured:false,images:[],videos:[],audios:[],description:'Energy efficient induction cooktop.'},
  {id:7,name:'Apple AirPods Pro 2',brand:'Apple',category:'Electronics',price:21999,originalPrice:26999,rating:4.9,reviewCount:5100,stock:25,badge:'hot',featured:true,images:[],videos:[],audios:[],description:'Active noise cancellation earbuds.'},
  {id:8,name:'Adidas Ultraboost 23',brand:'Adidas',category:'Sports',price:9999,originalPrice:14999,rating:4.4,reviewCount:780,stock:35,badge:'deal',featured:false,images:[],videos:[],audios:[],description:'High performance running shoes.'},
  {id:9,name:'Nikon Z50 Camera',brand:'Nikon',category:'Electronics',price:58999,originalPrice:72000,rating:4.6,reviewCount:310,stock:10,badge:'',featured:true,images:[],videos:[],audios:[],description:'Mirrorless camera with 20.9MP sensor.'},
  {id:10,name:'Bosch Mixer Grinder',brand:'Bosch',category:'Kitchen',price:3799,originalPrice:5200,rating:4.3,reviewCount:890,stock:60,badge:'deal',featured:false,images:[],videos:[],audios:[],description:'Powerful 800W mixer grinder.'},
  {id:11,name:'Puma Track Jacket',brand:'Puma',category:'Sports',price:1999,originalPrice:3500,rating:4.0,reviewCount:230,stock:45,badge:'new',featured:false,images:[],videos:[],audios:[],description:'Lightweight sports track jacket.'},
  {id:12,name:'JBL Flip 6 Speaker',brand:'JBL',category:'Electronics',price:8999,originalPrice:12999,rating:4.5,reviewCount:1500,stock:55,badge:'',featured:false,images:[],videos:[],audios:[],description:'Portable waterproof bluetooth speaker.'},
];

// ── Counters (set by deriveCounters after DB init) ────────────────────────────
let nextPid = 1;
let nextOid = 1;
let nextBid = 1;

// ── Database seeding (runs once when collections are empty) ───────────────────
async function seedCollections() {
  const db = getDb();
  const prodCount = await db.collection('products').countDocuments();
  if (prodCount === 0) {
    await db.collection('products').insertMany(DEF_PRODUCTS);
    console.log('[SEED] products inserted');
  }
  const catCount = await db.collection('categories').countDocuments();
  if (catCount === 0) {
    await db.collection('categories').insertMany(DEF_CATS.map(name => ({ name })));
    console.log('[SEED] categories inserted');
  }
  const banCount = await db.collection('banners').countDocuments();
  if (banCount === 0) {
    await db.collection('banners').insertMany(DEF_BANNERS);
    console.log('[SEED] banners inserted');
  }
  const setCount = await db.collection('settings').countDocuments();
  if (setCount === 0) {
    await db.collection('settings').insertOne(DEF_SETTINGS);
    console.log('[SEED] settings inserted');
  }
}

// ── Counter derivation ────────────────────────────────────────────────────────
async function deriveCounters() {
  const db = getDb();
  // nextPid
  const pidAgg = await db.collection('products').aggregate([
    { $group: { _id: null, maxId: { $max: '$id' } } }
  ]).toArray();
  nextPid = pidAgg.length > 0 ? (pidAgg[0].maxId || 0) + 1 : 1;

  // nextBid
  const bidAgg = await db.collection('banners').aggregate([
    { $group: { _id: null, maxId: { $max: '$id' } } }
  ]).toArray();
  nextBid = bidAgg.length > 0 ? (bidAgg[0].maxId || 0) + 1 : 1;

  // nextOid — parse numeric suffix from "ORDnnnnnn"
  const allOrders = await db.collection('orders').find({}, { projection: { id: 1 } }).toArray();
  const maxONum = allOrders.reduce((m, o) => {
    const n = parseInt(String(o.id || '').replace(/\D+/g, '') || '0');
    return Math.max(m, n);
  }, 0);
  nextOid = maxONum + 1;

  console.log(`[DB] nextPid:${nextPid} nextOid:${nextOid} nextBid:${nextBid}`);
}

// ── Multipart parser ──────────────────────────────────────────────────────────
// Reads entire body then splits on boundary — handles multiple files per field name
function parseMultipart(req) {
  return new Promise((resolve) => {
    const ct = req.headers['content-type'] || '';
    const bm = ct.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i);
    if (!bm) return resolve({ fields:{}, files:[] });

    const BOUNDARY = '--' + (bm[1]||bm[2]).trim();
    const bufs = [];
    req.on('data', c => bufs.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('error', () => resolve({ fields:{}, files:[] }));
    req.on('end', () => {
      try {
        const body   = Buffer.concat(bufs);
        const fields = {};
        const files  = [];
        const bBuf   = Buffer.from(BOUNDARY);
        const CRLF   = Buffer.from('\r\n');
        const CRLF2  = Buffer.from('\r\n\r\n');

        // Find all boundary positions
        const positions = [];
        let search = 0;
        while (true) {
          const pos = body.indexOf(bBuf, search);
          if (pos === -1) break;
          positions.push(pos);
          search = pos + bBuf.length;
        }

        for (let i = 0; i < positions.length; i++) {
          const start = positions[i] + bBuf.length;
          // skip \r\n after boundary
          let partStart = start;
          if (body[partStart]===13 && body[partStart+1]===10) partStart += 2;
          // check for closing --
          if (body[partStart]===45 && body[partStart+1]===45) break;

          const end = (i+1 < positions.length) ? positions[i+1] : body.length;
          const part = body.slice(partStart, end);

          // strip trailing \r\n before next boundary
          const stripped = (part.length>=2 && part[part.length-2]===13 && part[part.length-1]===10)
            ? part.slice(0,-2) : part;

          const hdrEnd = stripped.indexOf(CRLF2);
          if (hdrEnd === -1) continue;

          const hdrStr  = stripped.slice(0, hdrEnd).toString('utf8');
          const content = stripped.slice(hdrEnd + 4);

          const nameM  = hdrStr.match(/name="([^"]+)"/i);
          const fileM  = hdrStr.match(/filename="([^"]*)"/i);
          const ctypeM = hdrStr.match(/Content-Type:\s*([^\r\n;]+)/i);

          if (!nameM) continue;
          const fieldName = nameM[1];

          if (fileM && fileM[1]) {
            const ext    = path.extname(fileM[1]).toLowerCase();
            let   mime   = ctypeM ? ctypeM[1].trim() : '';
            if (!mime || mime === 'application/octet-stream') mime = EXT_TO_MIME[ext] || 'application/octet-stream';
            files.push({ fieldName, filename: fileM[1], mimeType: mime, data: content });
          } else {
            // text field — append if repeated key
            const val = content.toString('utf8');
            if (fields[fieldName] !== undefined) {
              if (!Array.isArray(fields[fieldName])) fields[fieldName] = [fields[fieldName]];
              fields[fieldName].push(val);
            } else {
              fields[fieldName] = val;
            }
          }
        }
        resolve({ fields, files });
      } catch(e) {
        console.error('[MP ERROR]', e.message);
        resolve({ fields:{}, files:[] });
      }
    });
  });
}

// ── Cloudinary ────────────────────────────────────────────────────────────────
// Uses Cloudinary's unsigned upload API — no SDK needed, pure HTTPS POST.
// Set CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET in Render env vars.
// Free tier: 25GB storage, 25GB bandwidth/month — plenty for a store.

const CLOUDINARY_CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME   || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'shophere_uploads';

// Live config — updated from DB settings at startup and on settings save
let _cloudName   = CLOUDINARY_CLOUD_NAME;
let _uploadPreset = CLOUDINARY_UPLOAD_PRESET;

async function loadCloudinaryConfig() {
  try {
    const db = getDb();
    const s  = await db.collection('settings').findOne({}, { projection: { cloudName:1, uploadPreset:1 } }) || {};
    if (s.cloudName)   _cloudName    = s.cloudName;
    if (s.uploadPreset) _uploadPreset = s.uploadPreset;
    if (_cloudName) console.log('[CLOUDINARY] configured — cloud:', _cloudName, 'preset:', _uploadPreset);
    else console.log('[CLOUDINARY] not configured — images saved locally');
  } catch(e) {}
}

async function uploadToCloudinary(fileData, mimeType, filename) {
  if (!_cloudName) return null; // Cloudinary not configured — fall back to local

  return new Promise((resolve) => {
    try {
      const boundary = '----CloudinaryBoundary' + crypto.randomUUID().replace(/-/g,'');
      const ext      = path.extname(filename).toLowerCase() || '.jpg';
      const chunks   = [];

      chunks.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="upload${ext}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      ));
      chunks.push(fileData);
      chunks.push(Buffer.from('\r\n'));

      chunks.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="upload_preset"\r\n\r\n` +
        `${_uploadPreset}\r\n`
      ));

      chunks.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="folder"\r\n\r\n` +
        `shophere\r\n`
      ));

      chunks.push(Buffer.from(`--${boundary}--\r\n`));

      const body    = Buffer.concat(chunks);
      const https   = require('https');
      const options = {
        hostname: 'api.cloudinary.com',
        port:     443,
        path:     `/v1_1/${_cloudName}/image/upload`,
        method:   'POST',
        headers:  {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.secure_url) resolve(json.secure_url);
            else { console.error('[CLOUDINARY] upload failed:', json.error); resolve(null); }
          } catch(e) { resolve(null); }
        });
      });
      req.on('error', (e) => { console.error('[CLOUDINARY] request error:', e.message); resolve(null); });
      req.write(body);
      req.end();
    } catch(e) {
      console.error('[CLOUDINARY] unexpected error:', e.message);
      resolve(null);
    }
  });
}

// Fetch a supplier image URL and re-upload to Cloudinary
// Solves hotlink blocking from supplier sites
async function mirrorImageToCloudinary(imageUrl) {
  if (!CLOUDINARY_CLOUD_NAME || !imageUrl || !imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.includes('cloudinary.com')) return imageUrl; // already on Cloudinary

  return new Promise((resolve) => {
    try {
      const https  = require('https');
      const http2  = require('http');
      const client = imageUrl.startsWith('https') ? https : http2;

      const req = client.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': imageUrl } }, (res) => {
        if (res.statusCode !== 200) { resolve(imageUrl); return; }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', async () => {
          const data     = Buffer.concat(chunks);
          const mimeType = res.headers['content-type'] || 'image/jpeg';
          const ext      = mimeType.includes('png') ? '.png' : mimeType.includes('gif') ? '.gif' : '.jpg';
          const cloudUrl = await uploadToCloudinary(data, mimeType, 'supplier' + ext);
          resolve(cloudUrl || imageUrl); // fall back to original if upload fails
        });
        res.on('error', () => resolve(imageUrl));
      });
      req.on('error', () => resolve(imageUrl));
      req.setTimeout(15000, () => { req.destroy(); resolve(imageUrl); });
    } catch(e) { resolve(imageUrl); }
  });
}

// ── Upload helper ─────────────────────────────────────────────────────────────
const MAX = { image:10*1024*1024, video:200*1024*1024, audio:50*1024*1024 };

function mimeKind(m) {
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return null;
}

function saveFile(file) {
  const ext  = path.extname(file.filename).toLowerCase() || '.bin';
  const name = crypto.randomUUID() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.data);
  return { url:'/uploads/'+name, type:file.mimeType, name:file.filename };
}

async function processMedia(files) {
  const images=[], videos=[], audios=[], errors=[];
  for (const f of files) {
    if (!f.filename || !f.data || f.data.length === 0) continue;
    const kind = mimeKind(f.mimeType);
    if (!kind) { errors.push(`Unsupported type ${f.mimeType} for ${f.filename}`); continue; }
    if (f.data.length > MAX[kind]) { errors.push(`${f.filename} exceeds ${MAX[kind]/1024/1024}MB limit`); continue; }

    if (kind === 'image' && _cloudName) {
      // Upload images to Cloudinary for permanent storage
      const cloudUrl = await uploadToCloudinary(f.data, f.mimeType, f.filename);
      if (cloudUrl) {
        images.push({ url: cloudUrl, type: f.mimeType, name: f.filename });
        console.log('[CLOUDINARY] uploaded:', cloudUrl);
        continue;
      }
    }
    // Fallback: save locally (videos, audio, or if Cloudinary not configured)
    const s = saveFile(f);
    if (kind==='image') images.push(s);
    else if (kind==='video') videos.push(s);
    else audios.push(s);
  }
  return { images, videos, audios, errors };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' });
  res.end(body);
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => b += c.toString());
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

// ── Server ────────────────────────────────────────────────────────────────────
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || 'shophere.in';

const server = http.createServer(async (req, res) => {
  // Redirect onrender.com URLs to the real domain on both desktop and mobile
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  if (host && host.endsWith('.onrender.com')) {
    const target = 'https://' + CUSTOM_DOMAIN + req.url;
    res.writeHead(301, { Location: target });
    return res.end();
  }

  const u  = new URL(req.url, `http://localhost:${PORT}`);
  const p  = u.pathname;
  const m  = req.method.toUpperCase();
  const sp = u.searchParams;

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (m==='OPTIONS') { res.writeHead(204); return res.end(); }

  try {

    // ── AUTH ──────────────────────────────────────────────────────────────────
    if (p === '/api/login' && m === 'POST') {
      const body = await readJSON(req);
      const db = getDb();
      const s = await db.collection('settings').findOne({}, { projection: { _id: 0 } }) || {};
      if (body.username === s.adminUsername && body.password === s.adminPassword) {
        return sendJSON(res, 200, { success: true, isAdmin: true, message: 'Admin login successful' });
      }
      return sendJSON(res, 200, { success: false, isAdmin: false, message: 'Invalid credentials' });
    }

    // ── SETTINGS ──────────────────────────────────────────────────────────────
    if (p==='/api/settings' && m==='GET') {
      const db = getDb();
      const doc = await db.collection('settings').findOne({}, { projection: { _id: 0 } }) || {};
      return sendJSON(res, 200, doc);
    }

    if (p==='/api/settings' && m==='POST') {
      const ct = (req.headers['content-type']||'').toLowerCase();
      let fields={}, files=[];
      if (ct.includes('multipart/form-data')) {
        const r = await parseMultipart(req);
        fields=r.fields; files=r.files;
      } else {
        fields = await readJSON(req);
      }
      const KEYS = ['storeName','primaryColor','announcementBar','scrollingText','contactEmail','contactPhone','contactAddress','freeShippingThreshold','footerText','termsAndConditions','privacyPolicy','returnPolicy','faqText','adminUsername','adminPassword','pushToken','cloudName','uploadPreset','bannerSizeVal','bannerSizeUnit','bannerFit','bannerTextSize','bannerPos','bannerTextColor','colorAnnoText','colorAnnoBg','colorTopBarText','colorProdName','colorProdPrice','colorProdBrand','colorHeading','colorBody','colorLink','colorFooterText','colorFooterHead','colorNavText','prodImgHeight','prodNameSize','prodPriceSize','prodCardBg','prodCardRadius','badgeNewBg','badgeDealBg','badgeHotBg','colorBg','colorBtnCart','colorBtnBuy','colorNavBg','colorFooterBg','font_heading','font_body','font_productName','font_productPrice','font_productBrand','font_navigation','font_footer','font_announcementBar','fontSize_heading','fontSize_body','fontSize_productName','fontSize_productPrice','fontSize_productBrand','fontSize_navigation','fontSize_footer','fontSize_announcementBar','fontWeight_heading','fontWeight_body','fontWeight_productName','fontWeight_productPrice','fontWeight_productBrand','fontWeight_navigation','fontWeight_footer','fontWeight_announcementBar','textColor_heading','textColor_body','textColor_productName','textColor_productPrice','textColor_productBrand','textColor_navigation','textColor_footer','textColor_announcementBar','visualOverrides'];
      const $set = {};
      KEYS.forEach(k => { if (fields[k] !== undefined) $set[k] = fields[k]; });
      const logo = files.find(f => f.fieldName==='logo' && f.data && f.data.length>0);
      if (logo) {
        const cloudUrl = _cloudName ? await uploadToCloudinary(logo.data, logo.mimeType, logo.filename) : null;
        $set.logo = cloudUrl || saveFile(logo).url;
      }
      const db = getDb();
      const updated = await db.collection('settings').findOneAndUpdate(
        {},
        { $set },
        { upsert: true, returnDocument: 'after', projection: { _id: 0 } }
      );
      console.log('[SAVE] settings OK —', updated.storeName);
      // Reload Cloudinary config if updated
      if ($set.cloudName || $set.uploadPreset) await loadCloudinaryConfig();
      return sendJSON(res, 200, updated);
    }

    // ── PRODUCTS ──────────────────────────────────────────────────────────────
    if (p==='/api/products' && m==='GET') {
      const db = getDb();
      const cat=sp.get('category'), q=(sp.get('q')||'').toLowerCase();
      const sort=sp.get('sort'), badge=sp.get('badge');
      const minP=parseFloat(sp.get('minPrice')||0), maxP=parseFloat(sp.get('maxPrice')||Infinity);
      const minR=parseFloat(sp.get('minRating')||0), featured=sp.get('featured');
      const page=parseInt(sp.get('page')||1), limit=parseInt(sp.get('limit')||500);
      let list = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray();
      if (cat && cat!=='all') list=list.filter(x=>x.category===cat);
      if (q) list=list.filter(x=>(x.name+' '+x.brand+' '+x.category+' '+(x.description||'')).toLowerCase().includes(q));
      if (badge) list=list.filter(x=>x.badge===badge);
      if (minP>0) list=list.filter(x=>x.price>=minP);
      if (maxP<Infinity) list=list.filter(x=>x.price<=maxP);
      if (minR>0) list=list.filter(x=>x.rating>=minR);
      if (featured==='true') list=list.filter(x=>x.featured);
      if (sort==='price_asc') list.sort((a,b)=>a.price-b.price);
      else if (sort==='price_desc') list.sort((a,b)=>b.price-a.price);
      else if (sort==='rating') list.sort((a,b)=>b.rating-a.rating);
      const total=list.length, start=(page-1)*limit;
      return sendJSON(res,200,{products:list.slice(start,start+limit),total,page,pages:Math.ceil(total/limit)});
    }

    const pm = p.match(/^\/api\/products\/(\d+)$/);
    if (pm && m==='GET') {
      const db = getDb();
      const prod = await db.collection('products').findOne({ id: +pm[1] }, { projection: { _id: 0 } });
      if(!prod) return sendJSON(res,404,{error:'Not found'});
      const revDoc = await db.collection('reviews').findOne({ productId: pm[1] });
      return sendJSON(res,200,{...prod, reviewsList: (revDoc && revDoc.reviews) || []});
    }

    if (p==='/api/products' && m==='POST') {
      const {fields,files} = await parseMultipart(req);
      if (!fields.name || !fields.name.trim()) return sendJSON(res,400,{error:'Product name is required'});
      const media = await processMedia(files);
      const db = getDb();
      const cats = await db.collection('categories').find({}, { projection: { _id: 0 } }).toArray();
      const firstCat = cats.length > 0 ? cats[0].name : 'Electronics';
      const prod = {
        id: nextPid++, name:fields.name.trim(), brand:fields.brand||'',
        category:fields.category||firstCat,
        description:fields.description||'',
        price:parseFloat(fields.price)||0,
        originalPrice:parseFloat(fields.originalPrice)||parseFloat(fields.price)||0,
        stock:parseInt(fields.stock)||0, badge:fields.badge||'',
        featured:fields.featured==='true', rating:0, reviewCount:0,
        images:media.images, videos:media.videos, audios:media.audios,
      };
      await db.collection('products').insertOne(prod);
      const { _id, ...prodOut } = prod;
      console.log(`[SAVE] product "${prod.name}" — images:${media.images.length} videos:${media.videos.length} audios:${media.audios.length}`);
      return sendJSON(res,201,{...prodOut, uploadErrors:media.errors});
    }

    if (pm && m==='PUT') {
      const db = getDb();
      const prev = await db.collection('products').findOne({ id: +pm[1] }, { projection: { _id: 0 } });
      if(!prev) return sendJSON(res,404,{error:'Not found'});
      const ct=(req.headers['content-type']||'').toLowerCase();
      let fields={}, files=[];
      if (ct.includes('multipart')) { const r=await parseMultipart(req); fields=r.fields; files=r.files; }
      else fields=await readJSON(req);
      const media = await processMedia(files);
      // Merge custom fields if present
      let mergedCustomFields = prev.customFields || {};
      if (fields.customFields) {
        try {
          const cf = typeof fields.customFields === 'string' ? JSON.parse(fields.customFields) : fields.customFields;
          mergedCustomFields = { ...mergedCustomFields, ...cf };
        } catch(e) {}
      }
      const updated={
        name:fields.name||prev.name, brand:fields.brand||prev.brand,
        category:fields.category||prev.category,
        description:fields.description!==undefined?fields.description:prev.description,
        price:fields.price!==undefined?parseFloat(fields.price):prev.price,
        originalPrice:fields.originalPrice!==undefined?parseFloat(fields.originalPrice):prev.originalPrice,
        stock:fields.stock!==undefined?parseInt(fields.stock):prev.stock,
        badge:fields.badge!==undefined?fields.badge:prev.badge,
        featured:fields.featured!==undefined?(fields.featured==='true'):prev.featured,
        images:[...(prev.images||[]),...media.images],
        videos:[...(prev.videos||[]),...media.videos],
        audios:[...(prev.audios||[]),...media.audios],
        customFields: mergedCustomFields,
      };
      const result = await db.collection('products').findOneAndUpdate(
        { id: +pm[1] },
        { $set: updated },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return sendJSON(res,200,{...result, uploadErrors:media.errors});
    }

    if (pm && m==='DELETE') {
      const db = getDb();
      await db.collection('products').deleteOne({ id: +pm[1] });
      return sendJSON(res,200,{deleted:true});
    }

    // remove single media
    const pmd=p.match(/^\/api\/products\/(\d+)\/media$/);
    if(pmd && m==='DELETE'){
      const body=await readJSON(req);
      const db = getDb();
      const prod = await db.collection('products').findOne({ id: +pmd[1] });
      if(!prod) return sendJSON(res,404,{error:'Not found'});
      const result = await db.collection('products').findOneAndUpdate(
        { id: +pmd[1] },
        { $pull: { images: { url: body.url }, videos: { url: body.url }, audios: { url: body.url } } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return sendJSON(res,200,result);
    }

    // ── RAZORPAY ─────────────────────────────────────────────────────────────
    const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || '';
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

    // Create Razorpay order
    if (p==='/api/razorpay/order' && m==='POST') {
      const body = await readJSON(req);
      const amountPaise = Math.round((body.amount||0) * 100); // convert ₹ to paise
      const authStr = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const payload = JSON.stringify({
        amount: amountPaise, currency: 'INR',
        receipt: 'rcpt_' + Date.now(),
        notes: { storeName: 'ShopHere.in' }
      });
      // Call Razorpay API using built-in https
      const https = require('https');
      const rzpResult = await new Promise((resolve, reject) => {
        const req2 = https.request({
          hostname: 'api.razorpay.com', port: 443, method: 'POST',
          path: '/v1/orders',
          headers: { 'Content-Type':'application/json', 'Authorization':'Basic '+authStr, 'Content-Length':Buffer.byteLength(payload) }
        }, (res2) => {
          let data = '';
          res2.on('data', c => data += c);
          res2.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        });
        req2.on('error', reject);
        req2.write(payload);
        req2.end();
      });
      if (rzpResult.error) return sendJSON(res, 400, { error: rzpResult.error.description || 'Razorpay error' });
      return sendJSON(res, 200, { orderId: rzpResult.id, amount: amountPaise, currency: 'INR', keyId: RAZORPAY_KEY_ID });
    }

    // Verify Razorpay payment signature
    if (p==='/api/razorpay/verify' && m==='POST') {
      const body = await readJSON(req);
      const crypto = require('crypto');
      const text = body.razorpay_order_id + '|' + body.razorpay_payment_id;
      const expectedSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(text).digest('hex');
      if (expectedSig !== body.razorpay_signature) {
        return sendJSON(res, 400, { success: false, error: 'Payment verification failed' });
      }
      return sendJSON(res, 200, { success: true, paymentId: body.razorpay_payment_id });
    }

    // ── ORDERS ────────────────────────────────────────────────────────────────
    if (p==='/api/orders' && m==='GET') {
      const db = getDb();
      const filter = {};
      const st=sp.get('status');
      if(st && st!=='all') filter.status = st;
      const list = await db.collection('orders').find(filter, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
      return sendJSON(res,200,list);
    }
    if (p==='/api/orders' && m==='POST') {
      const body=await readJSON(req);
      const db = getDb();
      // Decrement stock for each item
      for(const item of (body.items||[])){
        const pr = await db.collection('products').findOne({ id: item.id });
        if(pr) {
          const newStock = Math.max(0, pr.stock - (item.qty||1));
          await db.collection('products').updateOne({ id: item.id }, { $set: { stock: newStock } });
        }
      }
      const order={id:'ORD'+String(nextOid++).padStart(6,'0'),items:body.items||[],
        total:body.total||0,name:body.name||'',phone:body.phone||'',email:body.email||'',
        address:body.address||'',city:body.city||'',state:body.state||'',
        pin:body.pin||'',payment:body.payment||'cod',paymentDetail:body.paymentDetail||'',
        status:'Processing',date:new Date().toISOString()};
      await db.collection('orders').insertOne(order);
      const { _id, ...orderOut } = order;
      return sendJSON(res,201,orderOut);
    }
    const om=p.match(/^\/api\/orders\/(\w+)$/);
    if(om && m==='PUT'){
      const body=await readJSON(req);
      const db = getDb();
      const result = await db.collection('orders').findOneAndUpdate(
        { id: om[1] },
        { $set: body },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      if(!result) return sendJSON(res,404,{error:'Not found'});
      return sendJSON(res,200,result);
    }

    // ── REVIEWS ───────────────────────────────────────────────────────────────
    const rm=p.match(/^\/api\/reviews\/(\d+)$/);
    if(rm && m==='GET') {
      const db = getDb();
      const doc = await db.collection('reviews').findOne({ productId: rm[1] });
      return sendJSON(res,200,(doc && doc.reviews) || []);
    }
    if(rm && m==='POST'){
      const body=await readJSON(req);
      const pid=rm[1];
      if(!body.name||!body.text) return sendJSON(res,400,{error:'Name and text required'});
      const rev={id:Date.now(),name:body.name,rating:Math.min(5,Math.max(1,parseInt(body.rating)||5)),text:body.text,date:new Date().toISOString()};
      const db = getDb();
      const revResult = await db.collection('reviews').findOneAndUpdate(
        { productId: pid },
        { $push: { reviews: { $each: [rev], $position: 0 } } },
        { upsert: true, returnDocument: 'after' }
      );
      const allRevs = (revResult && revResult.reviews) || [rev];
      const newRating = Math.round((allRevs.reduce((s,r)=>s+r.rating,0)/allRevs.length)*10)/10;
      const newCount = allRevs.length;
      await db.collection('products').updateOne({ id: +pid }, { $set: { rating: newRating, reviewCount: newCount } });
      return sendJSON(res,201,rev);
    }

    // ── BANNERS ───────────────────────────────────────────────────────────────
    if(p==='/api/banners' && m==='GET') {
      const db = getDb();
      const list = await db.collection('banners').find({}, { projection: { _id: 0 } }).toArray();
      return sendJSON(res,200,list);
    }
    if(p==='/api/banners' && m==='POST'){
      const ct=(req.headers['content-type']||'').toLowerCase();
      let fields={},files=[];
      if(ct.includes('multipart')){const r=await parseMultipart(req);fields=r.fields;files=r.files;}
      else fields=await readJSON(req);
      const banner={id:nextBid++,bgGradient:fields.bgGradient||'linear-gradient(135deg,#1e293b,#f97316)',bgImage:'',
        headline:fields.headline||'',subtitle:fields.subtitle||'',ctaLabel:fields.ctaLabel||'Shop Now',ctaUrl:fields.ctaUrl||'#',active:fields.active!=='false'};
      const bg=files.find(f=>f.fieldName==='bgImage'&&f.data&&f.data.length>0);
      if(bg) {
        const cloudUrl = _cloudName ? await uploadToCloudinary(bg.data, bg.mimeType, bg.filename) : null;
        banner.bgImage = cloudUrl || saveFile(bg).url;
      }
      const db = getDb();
      await db.collection('banners').insertOne(banner);
      const { _id, ...bannerOut } = banner;
      return sendJSON(res,201,bannerOut);
    }
    const bm2=p.match(/^\/api\/banners\/(\d+)$/);
    if(bm2&&m==='PUT'){
      const body=await readJSON(req);
      const db = getDb();
      const result = await db.collection('banners').findOneAndUpdate(
        { id: +bm2[1] },
        { $set: body },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return sendJSON(res,200,result||{});
    }
    if(bm2&&m==='DELETE'){
      const db = getDb();
      await db.collection('banners').deleteOne({ id: +bm2[1] });
      return sendJSON(res,200,{deleted:true});
    }

    // ── CATEGORIES ────────────────────────────────────────────────────────────
    if(p==='/api/categories'&&m==='GET') {
      const db = getDb();
      const docs = await db.collection('categories').find({}, { projection: { _id: 0 } }).toArray();
      return sendJSON(res,200,docs.map(d=>d.name));
    }
    if(p==='/api/categories'&&m==='POST'){
      const{name}=await readJSON(req);const n=(name||'').trim();
      if(!n) return sendJSON(res,400,{error:'Name required'});
      const db = getDb();
      const existing = await db.collection('categories').findOne({ name: { $regex: new RegExp('^'+n+'$','i') } });
      if(existing) return sendJSON(res,409,{error:'Already exists'});
      await db.collection('categories').insertOne({ name: n });
      return sendJSON(res,201,{name:n});
    }
    const cm=p.match(/^\/api\/categories\/(\d+)$/);
    if(cm&&m==='PUT'){
      const body=await readJSON(req);
      const i=+cm[1];
      const nn=(body.name||'').trim();
      if(!nn) return sendJSON(res,400,{error:'Invalid'});
      const db = getDb();
      const allCats = await db.collection('categories').find({}, { projection: { _id: 0 } }).toArray();
      const old = allCats[i] && allCats[i].name;
      if(!old) return sendJSON(res,400,{error:'Invalid'});
      const dup = allCats.find((c,j)=>j!==i&&c.name.toLowerCase()===nn.toLowerCase());
      if(dup) return sendJSON(res,409,{error:'Already exists'});
      await db.collection('categories').updateOne({ name: old }, { $set: { name: nn } });
      await db.collection('products').updateMany({ category: old }, { $set: { category: nn } });
      return sendJSON(res,200,{name:nn});
    }
    if(cm&&m==='DELETE'){
      const i=+cm[1];
      const db = getDb();
      const allCats = await db.collection('categories').find({}, { projection: { _id: 0 } }).toArray();
      const nm = allCats[i] && allCats[i].name;
      if(!nm) return sendJSON(res,404,{error:'Not found'});
      const uncatExists = await db.collection('categories').findOne({ name: 'Uncategorised' });
      if(!uncatExists) await db.collection('categories').insertOne({ name: 'Uncategorised' });
      await db.collection('products').updateMany({ category: nm }, { $set: { category: 'Uncategorised' } });
      await db.collection('categories').deleteOne({ name: nm });
      return sendJSON(res,200,{deleted:true});
    }

    // ── DISCOUNTS ─────────────────────────────────────────────────────────────
    if(p==='/api/discounts' && m==='GET') {
      const db = getDb();
      const docs = await db.collection('discounts').find({}).sort({ createdAt: -1 }).toArray();
      return sendJSON(res, 200, docs.map(({_id,...d})=>({...d, id:_id.toString(), _id:_id.toString()})));
    }
    if(p==='/api/discounts' && m==='POST') {
      const body = await readJSON(req);
      const db = getDb();
      const exists = await db.collection('discounts').findOne({ code: body.code });
      if (exists) return sendJSON(res, 409, { error: 'Code already exists' });
      const doc = { ...body, usedCount: 0, createdAt: new Date().toISOString() };
      const result = await db.collection('discounts').insertOne(doc);
      return sendJSON(res, 201, { ...doc, id: result.insertedId.toString() });
    }
    if(p==='/api/discounts/validate' && m==='POST') {
      const body = await readJSON(req);
      const db = getDb();
      const d = await db.collection('discounts').findOne({ code: (body.code||'').toUpperCase() });
      if (!d) return sendJSON(res, 404, { error: 'Invalid coupon code' });
      if (!d.active) return sendJSON(res, 400, { error: 'This coupon is inactive' });
      if (d.expiry && new Date(d.expiry) < new Date()) return sendJSON(res, 400, { error: 'Coupon has expired' });
      if (d.maxUses > 0 && d.usedCount >= d.maxUses) return sendJSON(res, 400, { error: 'Coupon usage limit reached' });
      if (d.minOrder > 0 && (body.orderTotal||0) < d.minOrder) return sendJSON(res, 400, { error: `Min order ₹${d.minOrder} required` });
      return sendJSON(res, 200, { valid: true, type: d.type, value: d.value, code: d.code });
    }
    const discid = p.match(/^\/api\/discounts\/([a-f0-9]{24})$/);
    if(discid && m==='PUT') {
      const body = await readJSON(req);
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try { await db.collection('discounts').updateOne({ _id: new ObjectId(discid[1]) }, { $set: body }); return sendJSON(res, 200, { ok:true }); }
      catch(e) { return sendJSON(res, 400, { error: e.message }); }
    }
    if(discid && m==='DELETE') {
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try { await db.collection('discounts').deleteOne({ _id: new ObjectId(discid[1]) }); return sendJSON(res, 200, { deleted:true }); }
      catch(e) { return sendJSON(res, 400, { error: e.message }); }
    }

    // ── PUSH PRODUCT (from Chrome extension) ─────────────────────────────────
    if (p === '/api/push-product' && m === 'POST') {
      const body = await readJSON(req);

      // Token check — if a push token is configured in settings, verify it
      const db      = getDb();
      const settings = await db.collection('settings').findOne({}, { projection: { pushToken: 1 } }) || {};
      if (settings.pushToken && settings.pushToken.trim()) {
        if (body.pushToken !== settings.pushToken) {
          return sendJSON(res, 401, { error: 'Invalid push token. Check your extension settings.' });
        }
      }

      const name = (body.name || '').trim();
      if (!name)  return sendJSON(res, 400, { error: 'Product name is required' });
      const price = parseFloat(body.price) || 0;
      if (!price) return sendJSON(res, 400, { error: 'Price is required' });

      // Auto-create category if new
      const cat = (body.category || 'Imported').trim();
      const catExists = await db.collection('categories').findOne({ name: cat });
      if (!catExists) await db.collection('categories').insertOne({ name: cat });

      // Build images array from URLs — mirror through Cloudinary to avoid hotlink blocking
      const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
      const images = [];
      for (const url of imageUrls.slice(0, 5)) {
        const finalUrl = await mirrorImageToCloudinary(url);
        images.push({ url: finalUrl, type: 'image/jpeg', name: 'pushed' });
      }

      const prod = {
        id:            nextPid++,
        name,
        brand:         (body.brand || '').trim() || 'Unknown',
        category:      cat,
        description:   (body.description || '').trim(),
        price,
        originalPrice: parseFloat(body.originalPrice) || Math.ceil(price * 1.3),
        stock:         parseInt(body.stock) || 10,
        badge:         (body.badge || '').toLowerCase().trim(),
        featured:      false,
        rating:        0,
        reviewCount:   0,
        images,
        videos:        [],
        audios:        [],
        supplier:      (body.sourceSite || '').trim(),
        supplierPrice: parseFloat(body.supplierPrice) || 0,
        sourceUrl:     (body.sourceUrl || '').trim(),
        sku:           (body.sku || '').trim(),
        importedAt:    new Date().toISOString(),
        importMethod:  'extension',
      };

      await db.collection('products').insertOne(prod);
      const { _id, ...prodOut } = prod;
      console.log(`[PUSH] "${prod.name}" from ${prod.supplier} — id:${prod.id}`);
      return sendJSON(res, 201, prodOut);
    }

    // ── SUPPLIER IMPORT ───────────────────────────────────────────────────────
    // POST /api/import/products — bulk insert products from parsed CSV rows
    if (p === '/api/import/products' && m === 'POST') {
      const body = await readJSON(req);
      const rows = body.products;
      if (!Array.isArray(rows) || rows.length === 0)
        return sendJSON(res, 400, { error: 'No products provided' });

      const db = getDb();
      const cats = await db.collection('categories').find({}, { projection: { _id: 0 } }).toArray();
      const catNames = cats.map(c => c.name);

      const imported = [];
      const skipped  = [];
      const newCats  = new Set();

      for (const row of rows) {
        const name = (row.name || '').trim();
        if (!name) { skipped.push({ row, reason: 'Missing name' }); continue; }

        const price = parseFloat(row.price) || 0;
        if (price <= 0) { skipped.push({ row, reason: 'Invalid price' }); continue; }

        // Auto-create category if new
        const cat = (row.category || 'Imported').trim();
        if (!catNames.includes(cat)) {
          const exists = await db.collection('categories').findOne({ name: cat });
          if (!exists) {
            await db.collection('categories').insertOne({ name: cat });
            catNames.push(cat);
            newCats.add(cat);
          }
        }

        // Build images array from URL string — mirror through Cloudinary
        const imageUrls = (row.imageUrl || row.image || row.images || '')
          .split(/[,|;]+/).map(s => s.trim()).filter(Boolean);
        const images = [];
        for (const imgUrl of imageUrls.slice(0, 3)) {
          const finalUrl = await mirrorImageToCloudinary(imgUrl);
          images.push({ url: finalUrl, type: 'image/jpeg', name: 'imported' });
        }

        const prod = {
          id: nextPid++,
          name,
          brand:         (row.brand || row.Brand || '').trim() || 'Unknown',
          category:      cat,
          description:   (row.description || row.desc || '').trim(),
          price,
          originalPrice: parseFloat(row.originalPrice || row.mrp || row.comparePrice || price) || price,
          stock:         parseInt(row.stock || row.qty || row.quantity || 0) || 0,
          badge:         (row.badge || '').toLowerCase().trim(),
          featured:      String(row.featured || '').toLowerCase() === 'true',
          rating:        parseFloat(row.rating || 0) || 0,
          reviewCount:   0,
          images,
          videos:        [],
          audios:        [],
          supplier:      (row.supplier || body.supplierName || '').trim(),
          supplierSku:   (row.sku || row.supplierSku || row.SKU || '').trim(),
          importedAt:    new Date().toISOString(),
        };

        await db.collection('products').insertOne(prod);
        const { _id, ...prodOut } = prod;
        imported.push(prodOut);
      }

      console.log(`[IMPORT] ${imported.length} imported, ${skipped.length} skipped, ${newCats.size} new categories`);
      return sendJSON(res, 200, {
        imported: imported.length,
        skipped:  skipped.length,
        newCategories: [...newCats],
        skippedRows: skipped.slice(0, 20),
      });
    }

    // GET /api/import/template/:supplier — download CSV template
    const tplm = p.match(/^\/api\/import\/template\/(\w+)$/);
    if (tplm && m === 'GET') {
      const tpl = tplm[1];
      const templates = {
        generic:        'name,brand,category,price,originalPrice,stock,description,imageUrl,badge,sku\nSample Product,Brand Name,Electronics,999,1499,50,Product description here,https://example.com/image.jpg,new,SKU001',
        dropshipindia:  'Product Name,Brand,Category,Selling Price,MRP,Stock Qty,Description,Image URL,SKU\nSample Product,Brand,Category,999,1499,50,Description,https://example.com/image.jpg,SKU001',
        cjdropshipping: 'productNameEn,categoryName,sellPrice,suggestPrice,variants_stock,description,productImage,sku\nSample Product,Electronics,999,1499,50,Description,https://example.com/image.jpg,CJ001',
        hubbazaar:      'Title,Vendor,Product Type,Variant Price,Compare At Price,Variant Inventory Qty,Body (HTML),Image Src,Tags\nSample Product,Brand,Electronics,999,1499,50,Description,https://example.com/image.jpg,new',
        shopify:        'Title,Vendor,Product Category,Variant Price,Compare At Price,Variant Inventory Qty,Body (HTML),Image Src,Tags,Variant SKU\nSample Product,Brand,Electronics,999,1499,50,Description,https://example.com/image.jpg,new,SKU001',
        woocommerce:    'Name,Regular price,Sale price,Stock,Short description,Images,Categories,SKU,Brands\nSample Product,1499,999,50,Description,https://example.com/image.jpg,Electronics,SKU001,Brand',
      };
      const csv = templates[tpl] || templates.generic;
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="shophere_import_${tpl}.csv"`,
      });
      return res.end(csv);
    }

    // ── CUSTOM COLUMNS ────────────────────────────────────────────────────────
    // GET all column definitions
    if (p === '/api/customcolumns' && m === 'GET') {
      const db = getDb();
      const cols = await db.collection('customcolumns').find({}).sort({ order: 1 }).toArray();
      return sendJSON(res, 200, cols.map(({ _id, ...c }) => ({ ...c, id: _id.toString() })));
    }
    // POST create a new column definition
    if (p === '/api/customcolumns' && m === 'POST') {
      const body = await readJSON(req);
      if (!body.label || !body.label.trim()) return sendJSON(res, 400, { error: 'Column label is required' });
      const db = getDb();
      const count = await db.collection('customcolumns').countDocuments();
      const doc = {
        label: body.label.trim(),
        key: body.key || body.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        type: body.type || 'text',           // text | number | select | date
        options: body.options || [],          // for select type
        showIn: body.showIn || ['inventory'], // inventory | products | both
        order: count,
        createdAt: new Date().toISOString()
      };
      const result = await db.collection('customcolumns').insertOne(doc);
      return sendJSON(res, 201, { ...doc, id: result.insertedId.toString() });
    }
    const ccid = p.match(/^\/api\/customcolumns\/([a-f0-9]{24})$/);
    // PUT update column definition
    if (ccid && m === 'PUT') {
      const body = await readJSON(req);
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try {
        const { id, _id, ...upd } = body;
        await db.collection('customcolumns').updateOne({ _id: new ObjectId(ccid[1]) }, { $set: upd });
        return sendJSON(res, 200, { ok: true });
      } catch (e) { return sendJSON(res, 400, { error: e.message }); }
    }
    // DELETE column definition
    if (ccid && m === 'DELETE') {
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try {
        const col = await db.collection('customcolumns').findOne({ _id: new ObjectId(ccid[1]) });
        if (col) {
          // Remove this field from all products
          await db.collection('products').updateMany({}, { $unset: { [`customFields.${col.key}`]: '' } });
        }
        await db.collection('customcolumns').deleteOne({ _id: new ObjectId(ccid[1]) });
        return sendJSON(res, 200, { deleted: true });
      } catch (e) { return sendJSON(res, 400, { error: e.message }); }
    }
    // POST /api/customcolumns/reorder
    if (p === '/api/customcolumns/reorder' && m === 'POST') {
      const body = await readJSON(req);
      const db = getDb();
      const { ObjectId } = require('mongodb');
      for (let i = 0; i < (body.ids || []).length; i++) {
        try { await db.collection('customcolumns').updateOne({ _id: new ObjectId(body.ids[i]) }, { $set: { order: i } }); } catch (e) {}
      }
      return sendJSON(res, 200, { ok: true });
    }
    // POST /api/products/:id/customfields — save custom field values for a product
    const cfm = p.match(/^\/api\/products\/(\d+)\/customfields$/);
    if (cfm && m === 'POST') {
      const body = await readJSON(req);
      const db = getDb();
      const set = {};
      for (const [k, v] of Object.entries(body)) {
        set[`customFields.${k}`] = v;
      }
      await db.collection('products').updateOne({ id: +cfm[1] }, { $set: set });
      return sendJSON(res, 200, { ok: true });
    }

    // ── PAGE BLOCKS (Page Builder) ────────────────────────────────────────────
    if(p==='/api/pageblocks' && m==='GET') {
      const db = getDb();
      const blocks = await db.collection('pageblocks').find({}).sort({ order:1 }).toArray();
      return sendJSON(res, 200, blocks.map(({_id,...b})=>({...b, id:_id.toString()})));
    }
    if(p==='/api/pageblocks' && m==='POST') {
      const body = await readJSON(req);
      const db = getDb();
      const count = await db.collection('pageblocks').countDocuments();
      const doc = { ...body, order: count, visible: body.visible !== false, createdAt: new Date().toISOString() };
      const result = await db.collection('pageblocks').insertOne(doc);
      return sendJSON(res, 201, { ...doc, id: result.insertedId.toString() });
    }
    const pbm = p.match(/^\/api\/pageblocks\/reorder$/);
    if(pbm && m==='POST') {
      const body = await readJSON(req);
      const db = getDb();
      const { ObjectId } = require('mongodb');
      for(let i=0; i<(body.ids||[]).length; i++) {
        try { await db.collection('pageblocks').updateOne({ _id: new ObjectId(body.ids[i]) }, { $set: { order: i } }); } catch(e) {}
      }
      return sendJSON(res, 200, { ok:true });
    }
    const pbid = p.match(/^\/api\/pageblocks\/([a-f0-9]{24})$/);
    if(pbid && m==='PUT') {
      const body = await readJSON(req);
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try {
        const { id, _id, ...upd } = body;
        await db.collection('pageblocks').updateOne({ _id: new ObjectId(pbid[1]) }, { $set: upd });
        return sendJSON(res, 200, { ok:true });
      } catch(e) { return sendJSON(res, 400, { error: e.message }); }
    }
    if(pbid && m==='DELETE') {
      const db = getDb();
      const { ObjectId } = require('mongodb');
      try {
        await db.collection('pageblocks').deleteOne({ _id: new ObjectId(pbid[1]) });
        return sendJSON(res, 200, { deleted:true });
      } catch(e) { return sendJSON(res, 400, { error: e.message }); }
    }

    // ── STATS ─────────────────────────────────────────────────────────────────
    if(p==='/api/stats'&&m==='GET') {
      const db = getDb();
      const [totalProducts, totalOrders, revAgg, lowStock, processing] = await Promise.all([
        db.collection('products').countDocuments(),
        db.collection('orders').countDocuments(),
        db.collection('orders').aggregate([{ $group: { _id: null, sum: { $sum: '$total' } } }]).toArray(),
        db.collection('products').countDocuments({ stock: { $gt: 0, $lte: 10 } }),
        db.collection('orders').countDocuments({ status: 'Processing' }),
      ]);
      return sendJSON(res,200,{
        totalProducts, totalOrders,
        totalRevenue: revAgg.length > 0 ? revAgg[0].sum : 0,
        lowStock, processing
      });
    }

    // ── UPLOADED FILES ────────────────────────────────────────────────────────
    if(p.startsWith('/uploads/')){
      const fn=decodeURIComponent(p.slice(9));
      const fp=path.join(UPLOAD_DIR,fn);
      if(!fs.existsSync(fp)){res.writeHead(404);return res.end('Not found');}
      const ext=path.extname(fn).toLowerCase();
      res.writeHead(200,{'Content-Type':MIME_MAP[ext]||'application/octet-stream','Cache-Control':'public,max-age=86400'});
      return fs.createReadStream(fp).pipe(res);
    }

    // ── STATIC HTML/CSS/JS ────────────────────────────────────────────────────
    let fp = p==='/' ? '/index.html' : p;
    fp = path.join(BASE_DIR, fp);
    fs.readFile(fp,(err,data)=>{
      if(err){res.writeHead(404,{'Content-Type':'text/html'});return res.end('<h1>404 Not Found</h1>');}
      const ext=path.extname(fp).toLowerCase();
      res.writeHead(200,{'Content-Type':MIME_MAP[ext]||'text/plain'});
      res.end(data);
    });

  } catch(err) {
    console.error('[ERR]', err.stack);
    sendJSON(res,500,{error:'Server error: '+err.message});
  }
});

async function startServer() {
  await connectDB();
  await seedCollections();
  await deriveCounters();
  await loadCloudinaryConfig();
  server.listen(PORT, () => {
    console.log(`\n  ✅  ShopHere.in  →  http://localhost:${PORT}`);
    console.log(`  ⚙️   Admin Panel  →  http://localhost:${PORT}/admin.html\n`);
  });
}

startServer();
