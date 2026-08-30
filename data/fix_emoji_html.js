const fs = require('fs');
const path = require('path');

// Fix all HTML files
const files = ['index.html', 'admin.html'];

for (const fname of files) {
  const file = path.join(__dirname, '..', fname);
  let content = fs.readFileSync(file, 'utf8');
  const before = content.length;

  const replacements = [
    [/\u{1F6D2}/gu, ''],      // 🛒
    [/\u{1F4E6}/gu, ''],      // 📦
    [/\u2764\uFE0F/gu, ''],   // ❤️
    [/\u2764/gu, ''],         // ❤
    [/\u{1F90D}/gu, ''],      // 🤍
    [/\u2605/gu, '&#9733;'],  // ★
    [/\u2606/gu, '&#9734;'],  // ☆
    [/\u2B50/gu, '&#9733;'],  // ⭐
    [/\u{1F50D}/gu, ''],      // 🔍
    [/\u2705/gu, ''],         // ✅
    [/\u274C/gu, 'x'],        // ❌
    [/\u26A0\uFE0F/gu, '!'],  // ⚠️
    [/\u26A0/gu, '!'],        // ⚠
    [/\u{1F3E0}/gu, ''],      // 🏠
    [/\u{1F6CD}\uFE0F/gu, ''],// 🛍️
    [/\u{1F6CD}/gu, ''],      // 🛍
    [/\u{1F4B0}/gu, ''],      // 💰
    [/\u{1F195}/gu, 'NEW'],   // 🆕
    [/\u{1F3F7}\uFE0F/gu, ''],// 🏷️
    [/\u{1F3F7}/gu, ''],      // 🏷
    [/\u{1F4CA}/gu, ''],      // 📊
    [/\u{1F5BC}\uFE0F/gu, ''],// 🖼️
    [/\u{1F5BC}/gu, ''],      // 🖼
    [/\u270F\uFE0F/gu, ''],   // ✏️
    [/\u270F/gu, ''],         // ✏
    [/\u{1F5D1}\uFE0F/gu, ''],// 🗑️
    [/\u{1F5D1}/gu, ''],      // 🗑
    [/\u{1F4CD}/gu, ''],      // 📍
    [/\u{1F310}/gu, ''],      // 🌐
    [/\u{1F4E7}/gu, ''],      // 📧
    [/\u{1F381}/gu, ''],      // 🎁
    [/\u{1F3EA}/gu, ''],      // 🏪
    [/\u{1F44D}/gu, ''],      // 👍
    [/\u{1F440}/gu, ''],      // 👀
    [/\u{1F527}/gu, ''],      // 🔧
    [/\u{1F4DD}/gu, ''],      // 📝
    [/\u{1F6A8}/gu, ''],      // 🚨
    [/\u{1F4AF}/gu, ''],      // 💯
    [/\u{1F4C3}/gu, ''],      // 📃
    [/\u{1F4CB}/gu, ''],      // 📋
    [/\u{1F4C5}/gu, ''],      // 📅
    [/\u{1F4C4}/gu, ''],      // 📄
    [/\u{1F4C1}/gu, ''],      // 📁
    [/\u{1F4C2}/gu, ''],      // 📂
    [/\u{1F4BE}/gu, ''],      // 💾
    [/\u{1F517}/gu, ''],      // 🔗
    [/\u{1F510}/gu, ''],      // 🔐
    [/\u{1F512}/gu, ''],      // 🔒
    [/\u{1F513}/gu, ''],      // 🔓
    [/\u{1F514}/gu, ''],      // 🔔
    [/\u{1F6A7}/gu, ''],      // 🚧
    [/\u{1F3C3}/gu, ''],      // 🏃
    [/\u{1F463}/gu, ''],      // 👣
    [/\u{1F4F1}/gu, ''],      // 📱
    [/\u{1F4BB}/gu, ''],      // 💻
    [/\u{1F5A5}\uFE0F/gu, ''],// 🖥️
    [/\u{1F5A5}/gu, ''],      // 🖥
    [/\u{1F4F7}/gu, ''],      // 📷
    [/\u{1F3A5}/gu, ''],      // 🎥
    [/\u{1F3B5}/gu, ''],      // 🎵
    [/\u{1F457}/gu, ''],      // 👗
    [/\u{1F373}/gu, ''],      // 🍳
    [/\u26BD/gu, ''],         // ⚽
    [/\u{1F484}/gu, ''],      // 💄
    [/\u{1F4DA}/gu, ''],      // 📚
    [/\u{1F9F8}/gu, ''],      // 🧸
    [/\u{1F9D2}/gu, ''],      // 🧒
    [/\u{1F469}/gu, ''],      // 👩
    [/\u{1F468}/gu, ''],      // 👨
    [/\u{1F4B3}/gu, ''],      // 💳
    [/\u{1F389}/gu, ''],      // 🎉
    [/\u{1F680}/gu, ''],      // 🚀
    [/\u{1F464}/gu, ''],      // 👤
    [/\u{1F465}/gu, ''],      // 👥
    [/\u{1F4A1}/gu, ''],      // 💡
    [/\u{1F4AA}/gu, ''],      // 💪
    [/\u2192/gu, '->'],       // →
    [/\u2190/gu, '<-'],       // ←
    [/\u{1F195}/gu, 'NEW'],   // 🆕
    [/\u{1F199}/gu, 'UP'],    // 🆙
    [/\u2714\uFE0F/gu, ''],   // ✔️
    [/\u2714/gu, ''],         // ✔
    [/\u2716\uFE0F/gu, 'x'],  // ✖️
    [/\u2716/gu, 'x'],        // ✖
    [/\u{1F9E9}/gu, ''],      // 🧩
    [/\u{1F5C4}\uFE0F/gu, ''],// 🗄️
    [/\u{1F5C4}/gu, ''],      // 🗄
    [/\u{1F4E5}/gu, ''],      // 📥
    [/\u{1F4E4}/gu, ''],      // 📤
    [/\u{1F4C8}/gu, ''],      // 📈
    [/\u{1F4C9}/gu, ''],      // 📉
    [/\u{1F3D7}\uFE0F/gu, ''],// 🏗️
    [/\u{1F3D7}/gu, ''],      // 🏗
    [/\u{1F4CC}/gu, ''],      // 📌
    [/\u{1F4CE}/gu, ''],      // 📎
    [/\u{1F4CF}/gu, ''],      // 📏
    [/\u{1F4D0}/gu, ''],      // 📐
    [/\u{270D}\uFE0F/gu, ''], // ✍️
    [/\u{270D}/gu, ''],       // ✍
    [/\u{1F91D}/gu, ''],      // 🤝
    [/\u{1F4B9}/gu, ''],      // 💹
    [/\u{1F4B5}/gu, ''],      // 💵
    [/\u{1F4B8}/gu, ''],      // 💸
    [/\u26AA/gu, ''],         // ⚪
    [/\u26AB/gu, ''],         // ⚫
    [/\u{1F534}/gu, ''],      // 🔴
    [/\u{1F7E2}/gu, ''],      // 🟢
    [/\u{1F7E1}/gu, ''],      // 🟡
    [/\u2B24/gu, ''],         // ⬤
  ];

  let count = 0;
  for (const [pattern, replacement] of replacements) {
    const m = content.match(pattern);
    if (m && m.length > 0) {
      content = content.replace(pattern, replacement);
      console.log(`${fname}: Replaced ${m.length}x ${pattern} -> "${replacement}"`);
      count += m.length;
    }
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`${fname}: ${count} replacements, size ${before} -> ${content.length}\n`);
}
console.log('All done.');
