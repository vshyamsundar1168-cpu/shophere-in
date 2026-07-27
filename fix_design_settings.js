'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || '';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');

  // Fix all the bad color values that are overriding the new design
  await db.collection('settings').updateOne({}, { $set: {
    // Navigation — use new dark design variables
    colorNavBg:      '#232f3e',
    colorNavText:    '#cccccc',
    // Buttons — proper colors
    colorBtnBuy:     '#f97316',
    colorBtnCart:    '#fff7ed',
    // Badges
    badgeNewBg:      '#16a34a',
    badgeDealBg:     '#f97316',
    badgeHotBg:      '#e11d48',
    // Text colors — clean
    colorBody:       '#0f172a',
    colorHeading:    '#0f172a',
    colorProdName:   '#0f172a',
    colorProdPrice:  '#0f172a',
    colorProdBrand:  '#64748b',
    colorLink:       '#f97316',
    // Background
    colorBg:         '#f0f2f5',
    // Footer
    colorFooterBg:   '#131921',
    colorFooterText: '#94a3b8',
    colorFooterHead: '#ffffff',
    // Announcement
    colorAnnoBg:     '#131921',
    colorAnnoText:   '#ffffff',
    textColor_announcementBar: '#ffffff',
    // Product price color
    colorProdPrice:  '#0f172a',
  }});

  console.log('Settings fixed!');
  await client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
