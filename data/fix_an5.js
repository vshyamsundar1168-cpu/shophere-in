const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Find all occurrences of id="an-live" 
let count = 0;
let pos = -1;
let p = 0;
while((p = text.indexOf('id="an-live"', p)) !== -1) {
  count++;
  console.log('Found an-live at:', p);
  p++;
}
console.log('Total an-live occurrences:', count);

// Show context around first occurrence
const first = text.indexOf('id="an-live"');
console.log('Context:', JSON.stringify(text.slice(first-300, first+50)));
