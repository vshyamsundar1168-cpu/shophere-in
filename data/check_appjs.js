const fs = require('fs');

// Check app.js for broken ?? operators
const appjs = fs.readFileSync('C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/app.js', 'utf8');

// Find places where ?? was incorrectly stripped
// Pattern: "expression  'value'" missing the ??
const broken = [];
let i = 0;
const lines = appjs.split('\n');
lines.forEach((line, idx) => {
  // Look for patterns like: variable  'string' or variable  "string" where ?? is missing
  if (/\w\s+'[^']*'/.test(line) && !line.includes('??') && !line.includes('||') && 
      !line.includes('=') && line.trim().startsWith('//') === false) {
    // Only flag lines that look like they should have ?? 
    if (line.includes('.textContent') || line.includes('|| \'') || line.includes("|| '")) {
      broken.push({line: idx+1, content: line.trim().slice(0,80)});
    }
  }
  // Also check for obvious stripped ?? patterns
  if (/\w\s{2,}'/.test(line) && line.includes('.textContent')) {
    broken.push({line: idx+1, content: 'TEXTCONTENT: '+line.trim().slice(0,80)});
  }
});

if (broken.length) {
  console.log('Potentially broken lines:', broken.length);
  broken.forEach(b => console.log(b.line+':', b.content));
} else {
  console.log('app.js looks clean');
}

// Check admin.html for remaining broken patterns
const admin = fs.readFileSync('C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html', 'utf8');
const adminBroken = [];
admin.split('\n').forEach((line, idx) => {
  if (line.includes('.textContent') && /\w\s{2,}'/.test(line)) {
    adminBroken.push({line: idx+1, content: line.trim().slice(0,80)});
  }
});
if (adminBroken.length) {
  console.log('\nadmin.html broken textContent lines:');
  adminBroken.forEach(b => console.log(b.line+':', b.content));
} else {
  console.log('admin.html textContent lines look clean');
}

// Check for loadAllCats duplicate
const dupIdx = admin.indexOf("populateCatDropdown('ap_cat')");
const dupIdx2 = admin.indexOf("populateCatDropdown('ap_cat')", dupIdx+1);
console.log('\nap_cat first:', dupIdx, 'second:', dupIdx2);
