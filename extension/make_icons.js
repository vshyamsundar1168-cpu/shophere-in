// Run with: node make_icons.js
// Creates minimal orange square PNG icons for the extension
const fs = require('fs');
const path = require('path');

// Minimal 1x1 orange PNG (base64) — we'll use canvas to make proper ones
// Since we can't use canvas in Node without a package, create valid minimal PNGs

// A valid 16x16 orange PNG (pre-generated minimal binary)
// These are real 1-pixel PNGs scaled by the browser; Chrome accepts them
const png1x1_orange = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
  'MElEQVQ4T2P8z8BQDwADhQGAWjR9QgAAAABJRU5ErkJggg==',
  'base64'
);

const sizes = [16, 48, 128];
const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

sizes.forEach(size => {
  fs.writeFileSync(path.join(dir, `icon${size}.png`), png1x1_orange);
  console.log(`Created icon${size}.png`);
});
console.log('Icons created.');
