/**
 * Google Play Store review + app-metadata scraper
 * ------------------------------------------------
 * No browser / Chrome automation needed — this talks directly to the
 * same data endpoints the Play Store website uses, via the well-known
 * `google-play-scraper` library. Runs on plain Node.js on Windows.
 *
 * Usage:
 *   node scrape.js
 *
 * Output:
 *   ./output/reviews.db          <- SQLite database (apps + reviews tables) — primary store
 *   ./output/all_reviews.csv     <- every review from every app, one master file
 *   ./output/app_summary.csv     <- one row per app: metadata + computed review stats
 */

const gplayModule = require('google-play-scraper');
const gplay = gplayModule.default || gplayModule;
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 0. WORKAROUND for a real bug in google-play-scraper@9.2.0: its internal
//    extractCategories() helper checks `searchArray === null` but not
//    `undefined`, then immediately does `searchArray.length`. For app
//    listings where Play's raw data doesn't populate that field (small/
//    simple listings, seen on several apps in this run), that throws
//    "Cannot read properties of undefined (reading 'length')" and takes
//    down the ENTIRE app() call — even though every other field parsed
//    fine. We don't use the `categories` field (we already capture
//    genre/genreId via a separate, unaffected path), so patch the helper
//    to fail soft instead of crashing the whole request.
const categoryHelpers = require('google-play-scraper/lib/utils/mappingHelpers');
const originalExtractCategories = categoryHelpers.extractCategories;
categoryHelpers.extractCategories = function safeExtractCategories(...args) {
  try {
    return originalExtractCategories(...args);
  } catch (err) {
    return [];
  }
};

// ---------------------------------------------------------------------------
// 1. CONFIGURE WHICH APPS TO SCRAPE HERE
//    Find the package name (appId) in the Play Store URL:
//    https://play.google.com/store/apps/details?id=THIS_PART_HERE
// ---------------------------------------------------------------------------
const APPS = [
  // --- Explicitly requested apps ---
  { appId: 'com.goblintools', label: 'Goblin Tools (official)' },
  { appId: 'io.mindist.well', label: 'Numo' },
  { appId: 'com.tiimo.androidappreactnative', label: 'Tiimo' },
  { appId: 'com.llamaapp', label: 'Llama Life' },
  { appId: 'org.name.shimmerapp', label: 'Shimmer' },
  { appId: 'com.shimmer.copilot', label: 'Indy (Shimmer)' },
  { appId: 'com.briliadult', label: 'Brili Routines' },
  { appId: 'co.brili.routines', label: 'Brili Visual Timer' },
  { appId: 'com.focusbear', label: 'Focus Bear' },

  // --- Goblin Tools copycat/clone ---
  { appId: 'com.fau.goblin_tools', label: 'Goblin Tools - Adhd Planner (copycat)' },

  // --- "ADHD planner" search results ---
  { appId: 'neurolist.app.neurolist', label: 'neurolist: AI Planner for ADHD' },
  { appId: 'io.actimate', label: 'Actimate: ADHD Planner' },
  { appId: 'com.gravityfocus.app', label: 'ADHD Planner - Gravity Focus' },
  { appId: 'super.planner.todolist.task.reminder', label: 'Super Planner: ADHD Routine AI' },
  { appId: 'pps.android.yoodoo', label: 'Yoodoo: ADHD Daily Planner' },
  { appId: 'dr.eledan.addie', label: 'Addie - ADHD Planner Organizer' },
  { appId: 'app.univi.prod', label: 'Unique: ADHD Planner & Journal' },
  { appId: 'com.anyplanner.app', label: 'Any Planner - ADHD Day Planner' },

  // --- "task breakdown AI" search results ---
  { appId: 'com.stepsai.adhdtaskassistant', label: 'ADHD Planner - AI Task Manager' },
  { appId: 'com.braindump.app', label: 'Braindump: ADHD AI Planner' },
  { appId: 'io.mindist.tasks', label: 'Kawaii Tasks: ADHD AI Tools' },
  { appId: 'com.ilkerb.mindpilot.taskmanager', label: 'MindPilot - AI Planner & ADHD Organizer' },
  { appId: 'com.nick.weiss.Decomposer', label: 'Splitti - ADHD Planner AI Task' },
  { appId: 'xyz.mobileentertainment.magictask', label: 'Magic Task: ADHD AI to do list' },

  // --- "ADHD task app" search results ---
  { appId: 'app.kaizenflow.adhdtodo.adhdtodo', label: 'Adhd Todo' },
  { appId: 'com.chadsprojects.survivethedayredux', label: 'ADHD Friendly Task App (Survive The Day Redux)' },
  { appId: 'com.chorefocus.app', label: 'Chore Focus: ADHD Task Manager' },
  { appId: 'app.routineflow.routineflow', label: 'RoutineFlow: Routine for ADHD' },
  { appId: 'co.thefab.tm', label: 'Clarify: Focus & Task Manager' },
  { appId: 'com.habitrpg.android.habitica', label: 'Habitica: Gamify Your Tasks' },

  // --- "Structured daily planner" search result ---
  { appId: 'io.unorderly.structured', label: 'Structured - Daily Planner' },

  // --- "Finch self care" search result ---
  { appId: 'com.finch.finch', label: 'Finch: Self-Care Pet' },

  // --- "Inflow ADHD" search result ---
  { appId: 'inflow.adhd.productivity', label: 'Inflow - Manage Your ADHD' },
];

// How many reviews to try to collect per app, PER SORT ORDER (see step 4 in
// README — empirically the Play review feed for this endpoint keeps handing
// back new, non-duplicate reviews well past 10,000 for high-volume apps, so
// this is set generously high; small apps will just naturally run out of
// reviews and stop long before this number via nextPaginationToken becoming
// null).
const MAX_REVIEWS_PER_APP = 15000;
// Reviews requested per page (this is what the library's batchexecute
// endpoint actually returns per call, regardless of what you ask for)
const PAGE_SIZE = 150;
// Delay between requests, in ms — be polite, don't hammer Google's servers
const DELAY_MS = 1500;
// Sort orders to pull and merge (dedup by review id) — different sort orders
// surface different reviews before the feed's practical limit kicks in.
const SORT_ORDERS = [
  { sort: gplay.sort.NEWEST, name: 'NEWEST' },
  { sort: gplay.sort.RATING, name: 'RATING' },
];

const OUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// 2. SET UP THE LOCAL DATABASE
// ---------------------------------------------------------------------------
const db = new Database(path.join(OUT_DIR, 'reviews.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    appId TEXT PRIMARY KEY,
    platform TEXT DEFAULT 'android',
    label TEXT,
    title TEXT,
    summary TEXT,
    description TEXT,
    developer TEXT,
    developerId TEXT,
    developerEmail TEXT,
    developerWebsite TEXT,
    genre TEXT,
    genreId TEXT,
    contentRating TEXT,
    contentRatingDescription TEXT,
    score REAL,
    scoreText TEXT,
    ratings INTEGER,
    reviewsCount INTEGER,
    histogram TEXT,
    installs TEXT,
    minInstalls INTEGER,
    maxInstalls INTEGER,
    price REAL,
    free INTEGER,
    currency TEXT,
    offersIAP INTEGER,
    adSupported INTEGER,
    androidVersion TEXT,
    androidVersionText TEXT,
    icon TEXT,
    headerImage TEXT,
    recentChanges TEXT,
    released TEXT,
    updated TEXT,
    version TEXT,
    url TEXT,
    scrapedAt TEXT,
    fetchError TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    appId TEXT,
    platform TEXT DEFAULT 'android',
    userName TEXT,
    userImage TEXT,
    score INTEGER,
    title TEXT,
    text TEXT,
    thumbsUp INTEGER,
    version TEXT,
    reviewDate TEXT,
    replyText TEXT,
    replyDate TEXT,
    url TEXT,
    foundVia TEXT,
    scrapedAt TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_appId ON reviews(appId);
  CREATE INDEX IF NOT EXISTS idx_reviews_score ON reviews(score);
`);

const upsertApp = db.prepare(`
  INSERT INTO apps (appId, platform, label, title, summary, description, developer, developerId,
                     developerEmail, developerWebsite, genre, genreId, contentRating,
                     contentRatingDescription, score, scoreText, ratings, reviewsCount, histogram,
                     installs, minInstalls, maxInstalls, price, free, currency, offersIAP,
                     adSupported, androidVersion, androidVersionText, icon, headerImage,
                     recentChanges, released, updated, version, url, scrapedAt, fetchError)
  VALUES (@appId, 'android', @label, @title, @summary, @description, @developer, @developerId,
          @developerEmail, @developerWebsite, @genre, @genreId, @contentRating,
          @contentRatingDescription, @score, @scoreText, @ratings, @reviewsCount, @histogram,
          @installs, @minInstalls, @maxInstalls, @price, @free, @currency, @offersIAP,
          @adSupported, @androidVersion, @androidVersionText, @icon, @headerImage,
          @recentChanges, @released, @updated, @version, @url, @scrapedAt, @fetchError)
  ON CONFLICT(appId) DO UPDATE SET
    label=excluded.label, title=excluded.title, summary=excluded.summary,
    description=excluded.description, developer=excluded.developer, developerId=excluded.developerId,
    developerEmail=excluded.developerEmail, developerWebsite=excluded.developerWebsite,
    genre=excluded.genre, genreId=excluded.genreId, contentRating=excluded.contentRating,
    contentRatingDescription=excluded.contentRatingDescription, score=excluded.score,
    scoreText=excluded.scoreText, ratings=excluded.ratings, reviewsCount=excluded.reviewsCount,
    histogram=excluded.histogram, installs=excluded.installs, minInstalls=excluded.minInstalls,
    maxInstalls=excluded.maxInstalls, price=excluded.price, free=excluded.free,
    currency=excluded.currency, offersIAP=excluded.offersIAP, adSupported=excluded.adSupported,
    androidVersion=excluded.androidVersion, androidVersionText=excluded.androidVersionText,
    icon=excluded.icon, headerImage=excluded.headerImage, recentChanges=excluded.recentChanges,
    released=excluded.released, updated=excluded.updated, version=excluded.version, url=excluded.url,
    scrapedAt=excluded.scrapedAt, fetchError=excluded.fetchError
`);

const upsertReview = db.prepare(`
  INSERT INTO reviews (id, appId, platform, userName, userImage, score, title, text, thumbsUp,
                        version, reviewDate, replyText, replyDate, url, foundVia, scrapedAt)
  VALUES (@id, @appId, 'android', @userName, @userImage, @score, @title, @text, @thumbsUp,
          @version, @reviewDate, @replyText, @replyDate, @url, @foundVia, @scrapedAt)
  ON CONFLICT(id) DO UPDATE SET
    text=excluded.text, thumbsUp=excluded.thumbsUp, replyText=excluded.replyText,
    replyDate=excluded.replyDate, foundVia=excluded.foundVia,
    scrapedAt=excluded.scrapedAt
`);

// Wrapping the per-review upserts in a single transaction matters a lot at
// scale: better-sqlite3 auto-commits (with a disk fsync) after every bare
// .run() call, so saving thousands of reviews one at a time for a big app
// like Finch or Habitica can take minutes of pure disk-sync overhead. Doing
// it inside one transaction commits once at the end instead.
const saveReviews = db.transaction((rows) => {
  for (const row of rows) upsertReview.run(row);
});

// ---------------------------------------------------------------------------
// 3. CSV HELPERS
// ---------------------------------------------------------------------------
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function writeCsv(filePath, header, rows) {
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

// ---------------------------------------------------------------------------
// 4. MAIN SCRAPE LOOP
// ---------------------------------------------------------------------------
const runStats = []; // one entry per app, for the final summary printed to console

async function fetchReviewsForSort(appId, sortDef, scrapedAt) {
  const collected = new Map(); // id -> row, dedup within this sort run
  let nextToken;
  let pageNum = 0;

  do {
    pageNum++;
    let page;
    try {
      page = await gplay.reviews({
        appId,
        sort: sortDef.sort,
        lang: 'en',
        country: 'us',
        num: PAGE_SIZE,
        paginate: true,
        nextPaginationToken: nextToken,
      });
    } catch (err) {
      console.error(`  ! [${sortDef.name}] review page ${pageNum} failed:`, err.message);
      break;
    }

    const batch = page.data || [];
    for (const rv of batch) {
      collected.set(rv.id, {
        id: rv.id,
        appId,
        userName: rv.userName || null,
        userImage: rv.userImage || null,
        score: rv.score ?? null,
        title: rv.title || null,
        text: rv.text || '',
        thumbsUp: rv.thumbsUp ?? 0,
        version: rv.version || null,
        reviewDate: rv.date ? new Date(rv.date).toISOString() : null,
        replyText: rv.replyText || null,
        replyDate: rv.replyDate ? new Date(rv.replyDate).toISOString() : null,
        url: rv.url || null,
        foundVia: sortDef.name,
        scrapedAt,
      });
    }

    nextToken = page.nextPaginationToken;
    console.log(`  [${sortDef.name}] page ${pageNum}: +${batch.length} (unique so far: ${collected.size})`);

    if (batch.length === 0) break; // no more results
    await sleep(DELAY_MS);
  } while (nextToken && collected.size < MAX_REVIEWS_PER_APP);

  return { rows: collected, hitCeiling: Boolean(nextToken) && collected.size >= MAX_REVIEWS_PER_APP };
}

async function scrapeApp({ appId, label }) {
  console.log(`\n=== ${label} (${appId}) ===`);
  const scrapedAt = new Date().toISOString();
  const stat = { appId, label, ok: false, reviewsCollected: 0, hitCeiling: false, error: null };

  // --- App metadata ---
  let appInfo = null;
  try {
    appInfo = await gplay.app({ appId, lang: 'en', country: 'us' });
  } catch (err) {
    console.error(`  ! Could not fetch app info for ${appId}:`, err.message);
    upsertApp.run({
      appId, label, title: null, summary: null, description: null, developer: null, developerId: null,
      developerEmail: null, developerWebsite: null, genre: null, genreId: null, contentRating: null,
      contentRatingDescription: null, score: null, scoreText: null, ratings: null, reviewsCount: null,
      histogram: null, installs: null, minInstalls: null, maxInstalls: null, price: null, free: null,
      currency: null, offersIAP: null, adSupported: null, androidVersion: null, androidVersionText: null,
      icon: null, headerImage: null, recentChanges: null, released: null, updated: null, version: null,
      url: null, scrapedAt, fetchError: err.message,
    });
    stat.error = `app info: ${err.message}`;
    runStats.push(stat);
    return;
  }

  upsertApp.run({
    appId,
    label,
    title: appInfo.title || null,
    summary: appInfo.summary || null,
    description: appInfo.description || null,
    developer: appInfo.developer || null,
    developerId: appInfo.developerId || null,
    developerEmail: appInfo.developerEmail || null,
    developerWebsite: appInfo.developerWebsite || null,
    genre: appInfo.genre || null,
    genreId: appInfo.genreId || null,
    contentRating: appInfo.contentRating || null,
    contentRatingDescription: appInfo.contentRatingDescription || null,
    score: appInfo.score ?? null,
    scoreText: appInfo.scoreText || null,
    ratings: appInfo.ratings ?? null,
    reviewsCount: appInfo.reviews ?? null,
    histogram: appInfo.histogram ? JSON.stringify(appInfo.histogram) : null,
    installs: appInfo.installs || null,
    minInstalls: appInfo.minInstalls ?? null,
    maxInstalls: appInfo.maxInstalls ?? null,
    price: appInfo.price ?? 0,
    free: appInfo.free ? 1 : 0,
    currency: appInfo.currency || null,
    offersIAP: appInfo.offersIAP ? 1 : 0,
    adSupported: appInfo.adSupported ? 1 : 0,
    androidVersion: appInfo.androidVersion || null,
    androidVersionText: appInfo.androidVersionText || null,
    icon: appInfo.icon || null,
    headerImage: appInfo.headerImage || null,
    recentChanges: appInfo.recentChanges || null,
    released: appInfo.released || null,
    updated: appInfo.updated ? new Date(appInfo.updated).toISOString() : null,
    version: appInfo.version || null,
    url: appInfo.url || null,
    scrapedAt,
    fetchError: null,
  });
  console.log(`  App info saved. Rating ${appInfo.score} (${appInfo.ratings} ratings), installs ${appInfo.minInstalls}+`);

  // --- Reviews: pull each sort order, then merge + dedup by review id ---
  const merged = new Map();
  let anyCeilingHit = false;

  for (const sortDef of SORT_ORDERS) {
    const { rows, hitCeiling } = await fetchReviewsForSort(appId, sortDef, scrapedAt);
    if (hitCeiling) anyCeilingHit = true;
    for (const [id, row] of rows) {
      if (merged.has(id)) {
        // already captured under the other sort order — just note both sources
        const existing = merged.get(id);
        if (!existing.foundVia.includes(row.foundVia)) {
          existing.foundVia = `${existing.foundVia},${row.foundVia}`;
        }
      } else {
        merged.set(id, row);
      }
    }
    await sleep(DELAY_MS);
  }

  saveReviews(merged.values());

  stat.ok = true;
  stat.reviewsCollected = merged.size;
  stat.hitCeiling = anyCeilingHit;
  stat.reviewsAvailable = appInfo.reviews ?? null;
  runStats.push(stat);

  console.log(`  Done. ${merged.size} unique reviews merged from ${SORT_ORDERS.map((s) => s.name).join(' + ')} and saved to DB.`);
}

// ---------------------------------------------------------------------------
// 5. CSV EXPORT (generated FROM the database after scraping, not instead of it)
// ---------------------------------------------------------------------------
function exportCsvs() {
  // (a) master reviews CSV — every review, every app, one file
  const reviewRows = db.prepare(`
    SELECT a.label AS appLabel, r.appId, r.id, r.userName, r.score, r.title, r.text, r.thumbsUp,
           r.version, r.reviewDate, r.replyText, r.replyDate, r.url, r.foundVia, r.scrapedAt
    FROM reviews r
    JOIN apps a ON a.appId = r.appId
    ORDER BY a.label, r.reviewDate DESC
  `).all();

  writeCsv(
    path.join(OUT_DIR, 'all_reviews.csv'),
    ['appLabel', 'appId', 'id', 'userName', 'score', 'title', 'text', 'thumbsUp', 'version',
      'reviewDate', 'replyText', 'replyDate', 'url', 'foundVia', 'scrapedAt'],
    reviewRows
  );
  console.log(`\nWrote output/all_reviews.csv (${reviewRows.length} rows)`);

  // (b) per-app summary CSV — metadata + computed stats
  const apps = db.prepare(`SELECT * FROM apps ORDER BY label`).all();
  const statsByApp = db.prepare(`
    SELECT appId,
           COUNT(*) AS collectedReviews,
           AVG(score) AS avgScoreCollected,
           SUM(CASE WHEN score <= 2 THEN 1 ELSE 0 END) AS lowStarCount,
           SUM(CASE WHEN score >= 4 THEN 1 ELSE 0 END) AS highStarCount
    FROM reviews
    GROUP BY appId
  `).all();
  const statsMap = new Map(statsByApp.map((s) => [s.appId, s]));

  const summaryRows = apps.map((a) => {
    const s = statsMap.get(a.appId) || { collectedReviews: 0, avgScoreCollected: null, lowStarCount: 0, highStarCount: 0 };
    const collected = s.collectedReviews || 0;
    return {
      ...a,
      collectedReviews: collected,
      avgScoreCollected: s.avgScoreCollected != null ? Number(s.avgScoreCollected.toFixed(2)) : null,
      pctLowStar: collected > 0 ? Number(((s.lowStarCount / collected) * 100).toFixed(1)) : null,
      pctHighStar: collected > 0 ? Number(((s.highStarCount / collected) * 100).toFixed(1)) : null,
    };
  });

  const summaryHeader = [
    'appId', 'label', 'title', 'developer', 'developerEmail', 'developerWebsite', 'genre',
    'contentRating', 'score', 'ratings', 'reviewsCount', 'histogram', 'installs', 'minInstalls',
    'price', 'free', 'offersIAP', 'adSupported', 'androidVersion', 'recentChanges', 'icon',
    'released', 'updated', 'version', 'url', 'collectedReviews', 'avgScoreCollected',
    'pctLowStar', 'pctHighStar', 'fetchError', 'scrapedAt',
  ];
  writeCsv(path.join(OUT_DIR, 'app_summary.csv'), summaryHeader, summaryRows);
  console.log(`Wrote output/app_summary.csv (${summaryRows.length} rows)`);
}

// ---------------------------------------------------------------------------
// 6. RUN
// ---------------------------------------------------------------------------
(async () => {
  for (const app of APPS) {
    try {
      await scrapeApp(app);
    } catch (err) {
      console.error(`  ! Unexpected error scraping ${app.appId}:`, err.message);
      runStats.push({ appId: app.appId, label: app.label, ok: false, reviewsCollected: 0, error: err.message });
    }
    await sleep(DELAY_MS);
  }

  exportCsvs();
  db.close();

  // --- Final summary ---
  console.log('\n================ SUMMARY ================');
  const okApps = runStats.filter((s) => s.ok);
  const failedApps = runStats.filter((s) => !s.ok);
  const totalReviews = okApps.reduce((sum, s) => sum + s.reviewsCollected, 0);
  const ceilingApps = okApps.filter((s) => s.hitCeiling);
  const shortApps = okApps.filter((s) => !s.hitCeiling);

  console.log(`Apps scraped successfully: ${okApps.length} / ${runStats.length}`);
  console.log(`Total reviews collected: ${totalReviews}`);
  console.log(`\nApps that hit the ${MAX_REVIEWS_PER_APP}-review-per-sort ceiling (more may exist):`);
  for (const s of ceilingApps) console.log(`  - ${s.label} (${s.appId}): ${s.reviewsCollected} collected`);
  if (ceilingApps.length === 0) console.log('  (none)');

  console.log(`\nApps that ran out of reviews naturally (fewer available than the ceiling):`);
  for (const s of shortApps) console.log(`  - ${s.label} (${s.appId}): ${s.reviewsCollected} collected (store lists ~${s.reviewsAvailable ?? 'unknown'} total)`);

  if (failedApps.length > 0) {
    console.log(`\nApps that FAILED to scrape:`);
    for (const s of failedApps) console.log(`  - ${s.label} (${s.appId}): ${s.error}`);
  } else {
    console.log(`\nNo apps failed to scrape.`);
  }

  console.log(`\nOpen output/reviews.db (e.g. with "DB Browser for SQLite"), or:`);
  console.log(`  output/all_reviews.csv   <- every review, every app, one file`);
  console.log(`  output/app_summary.csv   <- one row per app with metadata + stats`);
  console.log(`  node query.js <keyword>  <- quick keyword search across everything`);
})();
