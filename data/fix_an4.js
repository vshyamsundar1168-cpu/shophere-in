const fs = require('fs');
const path = 'C:/Users/Yadadri Manufacturer/Desktop/Kiro 1/admin.html';
let text = fs.readFileSync(path, 'utf8');

// The file now has TWO grid divs back to back - remove the second (old) one
// The old one starts with the duplicate grid and has ?? in it
const dupMarker = '    </div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">';
const idx = text.indexOf(dupMarker);
console.log('Duplicate at:', idx);

if (idx > 0) {
  // Find end of this duplicate grid
  let depth = 0;
  let end = idx + dupMarker.length - 50; // start from the opening <div
  const gridStart = text.indexOf('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">', idx + 10);
  console.log('Dup grid start:', gridStart);
  
  for (let i = gridStart; i < text.length - 5; i++) {
    if (text.slice(i, i+4) === '<div') depth++;
    else if (text.slice(i, i+6) === '</div') {
      depth--;
      if (depth === 0) { end = i + 6; break; }
    }
  }
  
  const removed = text.slice(gridStart, end);
  console.log('Removing:', JSON.stringify(removed.slice(0, 150)));
  
  // Remove it - just delete from gridStart to end
  text = text.slice(0, gridStart) + text.slice(end);
  
  // Also fix the </div> that was prepended
  text = text.replace('    </div><div style="display:grid;grid-template-columns:repeat(4,1fr)', 
                      '    </div>\n    <div style="display:grid;grid-template-columns:repeat(4,1fr)');
  
  fs.writeFileSync(path, text, 'utf8');
  console.log('SAVED - duplicate removed');
} else {
  console.log('No duplicate found');
}
