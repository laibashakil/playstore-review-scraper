# Play Store Review Scraper — Setup Guide (Windows)

This tool downloads app info + user reviews from the Google Play Store for a whole
category of ADHD/productivity apps and saves them into a local database
(`reviews.db`) plus two CSVs, so you can search, filter, and pivot across the
whole dataset while building your own app.

**No Chrome, no browser automation needed.** It talks directly to the same data
endpoints the Play Store website itself uses, via the `google-play-scraper` npm
library.

## 1. Install Node.js (one-time)
Download and install the **LTS** version from https://nodejs.org
(just click through the installer with default options)

## 2. Open a terminal in this folder
```
npm install
```

## 3. Run it
```
node scrape.js
```
It prints progress per app as it goes. With ~33 apps and two sort orders each,
a full run takes a while (Finch and Habitica alone have tens of thousands of
reviews and dominate the runtime) — expect somewhere around 30-60+ minutes
depending on network conditions. It deliberately pauses 1.5s between requests
so it doesn't get IP rate-limited (which would cost data, not just time).

## 4. Where your data ends up
- `output/reviews.db` — SQLite database, the primary store (`apps` + `reviews` tables)
- `output/all_reviews.csv` — **every review from every app**, one file, with
  `appLabel`/`appId` columns on every row so you can filter/pivot the whole
  dataset at once in Excel
- `output/app_summary.csv` — one row per app: full metadata (description,
  genre, histogram, developer contact info, etc.) plus computed stats
  (reviews collected, average score, % 1-2 star, % 4-5 star)

### Browsing the database visually
Download the free **DB Browser for SQLite** (https://sqlitebrowser.org/), open
`output/reviews.db`.

### Searching by keyword from the terminal
```
node query.js "subscription"
node query.js "cancel" com.goblintools
```
Searches every review collected for a keyword (optionally limited to one app)
and prints the most-upvoted matches first.

## 5. What's in the `apps` table / `app_summary.csv`
Everything `google-play-scraper`'s `app()` call returns that's useful for
product research: title, summary, full description, developer + contact info
(email/website), genre, contentRating, histogram (1-5 star breakdown as JSON),
installs, price/free/adSupported/offersIAP flags, androidVersion, icon URL,
recentChanges (changelog), released/updated dates, version, plus computed
`collectedReviews` / `avgScoreCollected` / `pctLowStar` / `pctHighStar`.

Note: Play Store no longer exposes a fixed APK `size` field in this API
(Android App Bundles made per-device size the norm), so that field isn't
collected — there's nothing meaningful to save there.

## 6. What's in the `reviews` table / `all_reviews.csv`
id, appId, appLabel, userName, score, title, text, thumbsUp, version,
reviewDate, replyText, replyDate, url, `foundVia` (which sort order(s)
surfaced this review — `NEWEST`, `RATING`, or both), scrapedAt.

## 7. How review collection works
For each app, reviews are pulled via **two separate sort orders** —
`sort.NEWEST` and `sort.RATING` — each paginated up to `MAX_REVIEWS_PER_APP`
(currently 15,000) reviews, then merged and deduplicated by review id. This
matters because Google's review feed only ever exposes a slice of an app's
total reviews, and different sort orders surface different reviews before
that slice runs out — merging both gets meaningfully more coverage than one
sort alone (confirmed empirically: e.g. Finch merged to 25,120 unique reviews
across two 15,000-review pulls, meaning roughly 5,000 didn't overlap).

**On the review feed's practical ceiling:** there's no fixed universal number.
Empirically, a single sort order kept returning new, non-duplicate reviews
past 20,000 for a very high-volume app with no sign of slowing down within a
~300-page test. For a mid-size app (RoutineFlow, ~500K installs) both sort
orders returned the exact same ~3,980 reviews and then ran dry — meaning that
app's entire *actual* review pool is ~4,000, regardless of what its Play
Store "ratings" count implies (ratings tallies star-only submissions, which
outnumber written reviews). In practice: **small/niche apps in this list hit
their true review-pool limit and stop naturally** (that's most of them);
**only very high-review apps (Finch, Habitica) come anywhere near the
15,000-per-sort cap this scraper is configured with**, and Finch did hit it.
The cap exists to bound runtime, not because 15,000 is some hard Play limit.

## 8. Adding more apps
Open `scrape.js` and add a line to the `APPS` list:
```js
{ appId: 'THIS_PART', label: 'Whatever name you want' },
```
Find `THIS_PART` in the Play Store URL:
`https://play.google.com/store/apps/details?id=THIS_PART`

## 9. Re-running later
Just run `node scrape.js` again whenever you want fresh reviews — it upserts
existing rows and adds new ones (keyed by review id / appId), so this becomes
a growing research archive rather than something you start over each time.
CSVs are regenerated from the database every run.

## Notes on responsible use
- This only reads data that's already publicly visible on the Play Store —
  the same reviews and app info anyone can see in their browser. It doesn't
  log in, doesn't bypass anything, and doesn't touch anyone's account.
- The built-in 1.5s delay between requests is there on purpose — don't
  remove it or crank `MAX_REVIEWS_PER_APP` way up without reason; aggressive
  scraping can get your IP temporarily rate-limited by Google, which would
  cost you data (incomplete pulls), not save time.
- This is meant for your own personal product research, not for
  redistributing or republishing the scraped review text elsewhere.

## Known gaps in this app list
A handful of package names that show up in search results for this category
are no longer live on the Play Store (confirmed via direct fetch, not just a
scraper quirk — genuine 404s from play.google.com itself):
- `co.brili.routines` ("Brili Visual Timer" listing — Brili's other app,
  `com.briliadult`, still works fine)
- `com.fau.goblin_tools` (a Goblin Tools subscription clone — plausibly
  removed by Google after being reported)
- `dr.eledan.addie` ("Addie - ADHD Planner Organizer")

If you find current replacement package IDs for any of these, add them to
`APPS` the normal way.

## Troubleshooting

**`better-sqlite3` fails during `npm install`:**
This package needs a small native binary; most Windows setups download a
prebuilt one automatically. If it still fails, try:
```
npm install --build-from-source
```
If that also fails, you likely need "Desktop development with C++" from the
free Visual Studio Build Tools:
https://visualstudio.microsoft.com/visual-cpp-build-tools/
As a fallback, you can skip the database entirely and just rely on the CSV
files in `output/` — they're enough to browse in Excel.

**Getting rate-limited / empty results:**
Wait 15–20 minutes and try again, and consider lowering `MAX_REVIEWS_PER_APP`
in `scrape.js`.

**"Cannot read properties of undefined (reading 'length')" errors:**
This was a real bug in `google-play-scraper@9.2.0`'s internal category-
parsing helper that could crash the entire `app()` call for certain app
listings. `scrape.js` patches around it at startup (see the comment at the
top of the file) — if you see this error anyway, the library version may
have changed; check `node_modules/google-play-scraper/lib/utils/mappingHelpers.js`.

**Want the App Store (iOS) version too?**
This one covers Google Play only, since that's what was asked for. The same
approach works for the App Store with a sibling library (`app-store-scraper`)
and could write into the same database — just ask and it can be added as a
second script.
