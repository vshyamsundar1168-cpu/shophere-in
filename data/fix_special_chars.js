const fs = require('fs');

const files = ['admin.html', 'app.js', 'index.html', 'style.css'];
const dir = require('path').join(__dirname, '..');

const replacements = [
  ['\u2014', '&mdash;'],    // em dash —
  ['\u2013', '&ndash;'],    // en dash –
  ['\u00B7', '&middot;'],   // middle dot ·
  ['\u00D7', '&times;'],    // multiplication ×
  ['\u00A0', ' '],          // non-breaking space
  ['\u2019', "'"],           // right single quote '
  ['\u2018', "'"],           // left single quote '
  ['\u201C', '"'],           // left double quote "
  ['\u201D', '"'],           // right double quote "
  ['\u2026', '...'],         // ellipsis …
  ['\u00AB', '&laquo;'],    // «
  ['\u00BB', '&raquo;'],    // »
  ['\u00AE', '&reg;'],      // ®
  ['\u00A9', '&copy;'],     // ©
  ['\u00E9', 'e'],          // é
  ['\u00E8', 'e'],          // è
  ['\u00E0', 'a'],          // à
  ['\u00F3', 'o'],          // ó
];

for (const fname of files) {
  const fpath = require('path').join(dir, fname);
  if (!fs.existsSync(fpath)) continue;
  
  let content = fs.readFileSync(fpath, 'utf8');
  const before = content.length;
  let total = 0;
  
  for (const [from, to] of replacements) {
    let count = 0;
    let idx = content.indexOf(from);
    while (idx >= 0) { count++; idx = content.indexOf(from, idx + 1); }
    if (count > 0) {
      content = content.split(from).join(to);
      total += count;
    }
  }
  
  // Final check - find any remaining non-ASCII chars between 0x80 and 0x2FFF
  let remaining = [];
  for (let i = 0; i < content.length; i++) {
    const cp = content.codePointAt(i);
    if (cp > 127 && cp < 0x2000) {
      remaining.push('U+' + cp.toString(16) + ' at ' + i);
    }
  }
  
  fs.writeFileSync(fpath, content, 'utf8');
  console.log(fname + ': replaced=' + total + ', remaining-non-ASCII=' + remaining.length + ', size=' + content.length);
  if (remaining.length > 0) remaining.slice(0,5).forEach(r => console.log('  ', r));
}
