const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// The ?? nullish coalescing operator was stripped by the catch-all regex
// Patterns like "d.live  '—'" should be "d.live ?? '—'"
// Also "d.today  '—'" etc.

const fixes = [
  // Restore ?? nullish coalescing operators that were stripped
  ["d.live   '—'",    "d.live   ?? '—'"],
  ["d.today  '—'",    "d.today  ?? '—'"],
  ["d.recent '—'",    "d.recent ?? '—'"],
  ["d.total  '—'",    "d.total  ?? '—'"],
  // Also handle with different spacing
  ["d.live '—'",      "d.live ?? '—'"],
  ["d.today '—'",     "d.today ?? '—'"],
  ["d.recent '—'",    "d.recent ?? '—'"],
  ["d.total '—'",     "d.total ?? '—'"],
];

let changed = 0;
for (const [old, rep] of fixes) {
  if (text.includes(old)) {
    text = text.split(old).join(rep);
    console.log('Fixed:', JSON.stringify(old), '->', JSON.stringify(rep));
    changed++;
  }
}

// Check what we have now
const idx = text.indexOf("d.live");
console.log('Context:', JSON.stringify(text.slice(idx-5, idx+60)));

// Also fix duplicate an-countries lines (should appear only once)
const c1 = text.indexOf('document.getElementById(\'an-countries\').innerHTML');
const c2 = text.indexOf('document.getElementById(\'an-countries\').innerHTML', c1+1);
const c3 = text.indexOf('document.getElementById(\'an-countries\').innerHTML', c2+1);
if(c2 > 0) console.log('Duplicate an-countries at:', c1, c2, c3);

// Remove extra duplicate an-countries assignments (keep only first)
if(c2 > 0) {
  // Find end of second line (up to semicolon + newline)
  let end2 = text.indexOf(';', c2) + 1;
  let removeBlock = text.slice(c2, end2);
  console.log('Removing duplicate:', JSON.stringify(removeBlock.slice(0,80)));
  text = text.slice(0, c2) + text.slice(end2);
}
// Check for third
const c3b = text.indexOf('document.getElementById(\'an-countries\').innerHTML');
const c4b = text.indexOf('document.getElementById(\'an-countries\').innerHTML', c3b+1);
if(c4b > 0) {
  let end4 = text.indexOf(';', c4b) + 1;
  text = text.slice(0, c4b) + text.slice(end4);
  console.log('Removed second duplicate');
}

fs.writeFileSync(path, text, 'utf8');
console.log('Saved. Changes:', changed);
