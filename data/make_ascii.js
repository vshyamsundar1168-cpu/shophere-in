// Make ALL source files pure 7-bit ASCII
const fs = require('fs');
const path = require('path');

const files = ['app.js', 'admin.html', 'index.html', 'style.css', 'server.js'];

for (const fname of files) {
  const fpath = path.join(__dirname, '..', fname);
  if (!fs.existsSync(fpath)) continue;
  
  const buf = fs.readFileSync(fpath);
  const result = [];
  let i = 0;
  let replaced = 0;
  
  while (i < buf.length) {
    const b = buf[i];
    if (b < 128) {
      // Pure ASCII - keep as-is
      result.push(b);
      i++;
    } else {
      // Multi-byte UTF-8 sequence - decode and replace
      let cp;
      let seqLen;
      if ((b & 0xE0) === 0xC0 && i + 1 < buf.length) {
        cp = ((b & 0x1F) << 6) | (buf[i+1] & 0x3F);
        seqLen = 2;
      } else if ((b & 0xF0) === 0xE0 && i + 2 < buf.length) {
        cp = ((b & 0x0F) << 12) | ((buf[i+1] & 0x3F) << 6) | (buf[i+2] & 0x3F);
        seqLen = 3;
      } else if ((b & 0xF8) === 0xF0 && i + 3 < buf.length) {
        cp = ((b & 0x07) << 18) | ((buf[i+1] & 0x3F) << 12) | ((buf[i+2] & 0x3F) << 6) | (buf[i+3] & 0x3F);
        seqLen = 4;
      } else {
        // Invalid UTF-8 byte, skip
        i++;
        replaced++;
        continue;
      }
      
      // Replace with ASCII equivalent
      let replacement = '';
      
      // Box drawing chars (U+2500-U+257F) -> '-'
      if (cp >= 0x2500 && cp <= 0x257F) replacement = '-';
      // Em dash U+2014 -> '--'
      else if (cp === 0x2014) replacement = '--';
      // En dash U+2013 -> '-'
      else if (cp === 0x2013) replacement = '-';
      // Rupee U+20B9 -> 'Rs.'
      else if (cp === 0x20B9) replacement = 'Rs.';
      // Middle dot U+00B7 -> '.'
      else if (cp === 0x00B7) replacement = '.';
      // Multiplication U+00D7 -> 'x'
      else if (cp === 0x00D7) replacement = 'x';
      // Right single quote U+2019 -> "'"
      else if (cp === 0x2019) replacement = "'";
      // Left single quote U+2018 -> "'"
      else if (cp === 0x2018) replacement = "'";
      // Right double quote U+201D -> '"'
      else if (cp === 0x201D) replacement = '"';
      // Left double quote U+201C -> '"'
      else if (cp === 0x201C) replacement = '"';
      // Ellipsis U+2026 -> '...'
      else if (cp === 0x2026) replacement = '...';
      // Stars already handled as entities, but just in case
      else if (cp === 0x2605 || cp === 0x2606) replacement = '*';
      // Non-breaking space U+00A0 -> ' '
      else if (cp === 0x00A0) replacement = ' ';
      // Any other non-ASCII -> empty (removes from code)
      else replacement = '';
      
      for (let j = 0; j < replacement.length; j++) {
        result.push(replacement.charCodeAt(j));
      }
      replaced++;
      i += seqLen;
    }
  }
  
  const outBuf = Buffer.from(result);
  fs.writeFileSync(fpath, outBuf);
  
  // Verify
  let remaining = 0;
  for (let j = 0; j < outBuf.length; j++) {
    if (outBuf[j] > 127) remaining++;
  }
  
  console.log(fname + ': replaced=' + replaced + ', remaining=' + remaining + ', size=' + outBuf.length);
}

console.log('\nAll files are now pure ASCII.');
