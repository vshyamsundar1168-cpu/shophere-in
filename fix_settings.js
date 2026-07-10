'use strict';
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || '';

async function main() {
  console.log('\n🔧 ShopHere.in — Restore Settings');
  console.log('===================================\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('shophere');
  console.log('✅ Connected to MongoDB\n');

  // Keep all existing settings but fix the broken/empty ones
  const fix = {
    // Restore scrolling/announcement text
    announcementBar:  'Free shipping on orders above ₹999 🚚',
    scrollingText:    'Welcome to ShopHere.in 🛍️  |  Delivery at your doorstep 🚚  |  We maintain quality products with reasonable price ✅',
    // Fix broken colors back to correct values
    bodyTextColor:    '#1e293b',
    linkColor:        '#f97316',
    headingColor:     '#1e293b',
    // Fix free shipping threshold
    freeShippingThreshold: '999',
    // Fix logo - will be empty until re-uploaded, but at least not a broken /uploads/ path
    logo: '',
    // Restore correct color settings
    colorAnnoText:    '#ffffff',
    colorAnnoBg:      '#1e293b',
    colorTopBarText:  '#ffffff',
    colorProdName:    '#1e293b',
    colorProdPrice:   '#1e293b',
    colorProdBrand:   '#64748b',
    colorHeading:     '#1e293b',
    colorBody:        '#1e293b',
    colorLink:        '#f97316',
    colorFooterText:  '#94a3b8',
    colorFooterHead:  '#ffffff',
    colorNavText:     '#94a3b8',
    colorBg:          '#f8fafc',
    colorBtnBuy:      '#f97316',
    colorBtnCart:     '#fff7ed',
    colorFooterBg:    '#1e293b',
    colorNavBg:       '#1e293b',
    bannerTextColor:  '#ffffff',
    // Text color overrides
    textColor_announcementBar: '#ffffff',
    textColor_body:            '#1e293b',
    textColor_footer:          '#94a3b8',
    textColor_heading:         '#1e293b',
    textColor_navigation:      '#94a3b8',
    textColor_productBrand:    '#64748b',
    textColor_productName:     '#1e293b',
    textColor_productPrice:    '#1e293b',
    // Banner
    bannerSizeVal:  '380',
    bannerSizeUnit: 'px',
    bannerFit:      'cover',
    bannerTextSize: 'large',
    bannerPos:      'center',
    bannerHeight:   '380',
    // Product card
    prodImgHeight:  '200',
    prodNameSize:   '14',
    prodPriceSize:  '17',
    prodCardBg:     '#ffffff',
    prodCardRadius: '12',
    // Badges
    badgeNewBg:  '#22c55e',
    badgeDealBg: '#f97316',
    badgeHotBg:  '#e11d48',
    // Keep cloudinary settings intact
  };

  const result = await db.collection('settings').findOneAndUpdate(
    {},
    { $set: fix },
    { returnDocument: 'after' }
  );

  console.log('✅ Settings restored successfully!\n');
  console.log('Fixed:');
  console.log('  ✅ Announcement bar text restored');
  console.log('  ✅ Scrolling marquee text restored');
  console.log('  ✅ All colors restored to correct values');
  console.log('  ✅ Free shipping threshold = ₹999');
  console.log('  ✅ Banner settings restored');
  console.log('\n⚠️  Note: Store logo needs to be re-uploaded via Admin → Store Settings');
  console.log('⚠️  Note: Contact details (email/phone/address) need to be re-entered');
  console.log('⚠️  Note: Terms/Privacy/FAQ text needs to be re-entered if you had them\n');

  await client.close();
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
