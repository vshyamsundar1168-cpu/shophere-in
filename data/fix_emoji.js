const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.js');
let content = fs.readFileSync(file, 'utf8');

// Replace all emoji with safe text equivalents
// These corrupt when served through Render due to encoding issues
const replacements = [
  // CAT_ICONS emoji
  [/\u{1F457}/gu, '[Fashion]'],   // 👗
  [/\u{1F373}/gu, '[Kitchen]'],   // 🍳
  [/\u26BD/gu,   '[Sports]'],     // ⚽
  [/\u{1F484}/gu, '[Beauty]'],    // 💄
  [/\u{1F4DA}/gu, '[Books]'],     // 📚
  [/\u{1F9F8}/gu, '[Toys]'],      // 🧸
  [/\u{1F9D2}/gu, '[Kids]'],      // 🧒
  [/\u{1F469}/gu, '[Women]'],     // 👩
  [/\u{1F468}/gu, '[Men]'],       // 👨
  [/\u{1F6CD}\uFE0F/gu, '[Shop]'],// 🛍️
  [/\u{1F6CD}/gu, '[Shop]'],      // 🛍
  // Product card emoji
  [/\u{1F4E6}/gu, '[Box]'],       // 📦
  [/\u2764\uFE0F/gu, '&#9829;'],  // ❤️
  [/\u2764/gu, '&#9829;'],        // ❤
  [/\u{1F90D}/gu, '&#9825;'],     // 🤍
  [/\u2605/gu, '&#9733;'],        // ★
  [/\u2606/gu, '&#9734;'],        // ☆
  [/\u2B50/gu, '&#9733;'],        // ⭐
  // UI emoji
  [/\u{1F50D}/gu, ''],            // 🔍
  [/\u{1F6D2}/gu, ''],            // 🛒
  [/\u2705/gu, ''],               // ✅
  [/\u274C/gu, 'x'],              // ❌
  [/\u26A0\uFE0F/gu, '!'],        // ⚠️
  [/\u26A0/gu, '!'],              // ⚠
  [/\u{1F3E0}/gu, ''],            // 🏠
  [/\u{1F6CD}\uFE0F/gu, ''],      // 🛍️
  // More icons that may appear
  [/\u{1F4B0}/gu, ''],            // 💰
  [/\u{1F195}/gu, 'NEW'],         // 🆕
  [/\u{1F3F7}\uFE0F/gu, ''],      // 🏷️
  [/\u{1F3F7}/gu, ''],            // 🏷
  [/\u{1F4CA}/gu, ''],            // 📊
  [/\u{1F5BC}\uFE0F/gu, ''],      // 🖼️
  [/\u{1F5BC}/gu, ''],            // 🖼
  [/\u270F\uFE0F/gu, 'Edit'],     // ✏️
  [/\u270F/gu, 'Edit'],           // ✏
  // Navigation arrows - replace only within JS strings not HTML
  [/\u2192/gu, '->'],             // →
  [/\u2190/gu, '<-'],             // ←
];

let count = 0;
for (const [pattern, replacement] of replacements) {
  const before = content.length;
  content = content.replace(pattern, replacement);
  const diff = before - content.length;
  if (diff !== 0) {
    console.log(`Replaced ${pattern} -> "${replacement}" (${diff} chars removed)`);
    count++;
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log(`\nDone. ${count} patterns replaced. File size: ${content.length}`);

// Verify no more multi-byte issues
const buf = Buffer.from(content, 'utf8');
let badBytes = 0;
for (let i = 0; i < buf.length - 2; i++) {
  if (buf[i] === 0xEF && buf[i+1] === 0xBF && buf[i+2] === 0xBD) badBytes++;
}
console.log(`Corrupted replacement chars remaining: ${badBytes}`);
