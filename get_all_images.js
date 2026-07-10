'use strict';
// Gets all 85 Cloudinary URLs in upload order and prints them as JSON
require('dotenv').config();
const https = require('https');

const CLOUD_NAME = 'wzaxevft';
const API_KEY    = '537229325423853';
const API_SECRET = 'FFamrjUJ-E3qMzHo-jwCTTuJshc';

function fetchResources() {
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
  const result = await fetchResources();
  const images = (result.resources || [])
    .filter(r => r.public_id.startsWith('shophere/'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(r => r.secure_url);
  console.log(JSON.stringify(images));
}
main().catch(e => { console.error(e.message); process.exit(1); });
