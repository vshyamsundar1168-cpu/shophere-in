const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// Fix any remaining replacement characters (U+FFFD = \uFFFD)
const before = (text.match(/\uFFFD/g)||[]).length;

// Replace garbled description
text = text.replace(/Live visitor map[\s\S]{0,5}see who visited/, 'Live visitor map - see who visited');
// Replace all ? replacement chars
text = text.replace(/\uFFFD/g, '-');

const after = (text.match(/\uFFFD/g)||[]).length;
console.log('Replacement chars before:', before, 'after:', after);

fs.writeFileSync(path, text, 'utf8');
console.log('SAVED');
