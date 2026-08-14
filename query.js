/**
 * Quick keyword search across every review you've scraped so far.
 *
 * Usage:
 *   node query.js "subscription"
 *   node query.js "cancel" com.goblintools
 */
const Database = require('better-sqlite3');
const path = require('path');

const keyword = process.argv[2];
const appIdFilter = process.argv[3];

if (!keyword) {
  console.log('Usage: node query.js "<keyword>" [appId]');
  process.exit(1);
}

const db = new Database(path.join(__dirname, 'output', 'reviews.db'), { readonly: true });

let sql = `
  SELECT r.appId, a.label, r.userName, r.score, r.reviewDate, r.thumbsUp, r.text, r.version, r.foundVia
  FROM reviews r
  JOIN apps a ON a.appId = r.appId
  WHERE r.text LIKE ?
`;
const params = [`%${keyword}%`];

if (appIdFilter) {
  sql += ' AND r.appId = ?';
  params.push(appIdFilter);
}

sql += ' ORDER BY r.thumbsUp DESC, r.reviewDate DESC LIMIT 200';

const rows = db.prepare(sql).all(...params);

console.log(`Found ${rows.length} reviews mentioning "${keyword}"${appIdFilter ? ` in ${appIdFilter}` : ''}:\n`);
for (const r of rows) {
  const dateStr = r.reviewDate ? r.reviewDate.slice(0, 10) : 'unknown date';
  console.log(`[${r.label} | ${r.score}★ | 👍${r.thumbsUp} | ${dateStr} | v${r.version || '?'}] ${r.userName}`);
  console.log(`  ${(r.text || '').replace(/\n/g, ' ').slice(0, 300)}`);
  console.log('');
}

db.close();
