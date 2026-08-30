// Remove ALL characters above U+007F that aren't standard punctuation/currency
// This is the nuclear option - replace any char > U+2000 with safe text
const fs = require('fs');

const FILES = ['../app.js', '../admin.html', '../index.html', '../style.css'];

for (const rel of FILES) {
  const file = require('path').join(__dirname, rel);
  if (!fs.existsSync(file)) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  const before = content.length;
  
  // Replace all emoji (chars with codepoints > U+1F000) with empty string
  // Keep: standard latin, accented chars, common symbols, ₹ sign (U+20B9)
  let result = '';
  let i = 0;
  let removed = 0;
  while (i < content.length) {
    const cp = content.codePointAt(i);
    const charLen = cp > 0xFFFF ? 2 : 1; // surrogate pairs take 2 chars
    
    if (cp > 0x2999 && cp !== 0x20B9) {
      // Replace emoji/special chars with nothing
      removed++;
      i += charLen;
    } else {
      result += content[i];
      i++;
      if (charLen === 2) result += content[i++]; // keep second surrogate if needed... actually no, skip
    }
  }
  
  // Actually do it cleanly - replace all high codepoints
  result = content.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]/gu, '');
  
  fs.writeFileSync(file, result, 'utf8');
  
  // Verify
  let remaining = 0;
  for (let j = 0; j < result.length; j++) {
    const cp2 = result.codePointAt(j);
    if (cp2 > 0xFFFF) remaining++;
    if (cp2 > 0xFFFF) j++;
  }
  
  console.log(rel.replace('../','') + ': ' + before + ' -> ' + result.length + ' (' + (before-result.length) + ' removed, ' + remaining + ' emoji remaining)');
}
