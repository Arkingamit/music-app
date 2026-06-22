/**
 * Scraper script for Songs of Praise – Hindi songs
 * Usage: node scripts/scrape-hindi-songs.mjs
 *
 * This script:
 *  1. Fetches the Hindi song list page from songsofpraise.in
 *  2. Extracts all individual song URLs
 *  3. Fetches each song page, extracting title, artist, original key, and lyrics+chords
 *  4. Inserts the songs directly into MongoDB (same DB the app uses)
 */

import { MongoClient } from 'mongodb';
import https from 'https';
import http from 'http';
import fs from 'fs';

const LOG_FILE = 'scrape-results.txt';
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

function logMsg(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

// ── Config ──────────────────────────────────────────────────────────────────
const MONGODB_URI = 'mongodb+srv://gracemusic:Ashish%40123@gracemusic.hwukmyy.mongodb.net/?appName=gracemusic';
const DB_NAME = 'gracemusic';
const COLLECTION = 'songs';
const BASE_URL = 'https://songsofpraise.in';
const SONG_LIST_URL = `${BASE_URL}/songlist.php?song_lang=Hindi`;
const GENRE = 'Hindi';
const CREATED_BY = 'songs-of-praise-import'; // system user for imports
const BATCH_SIZE = 1; // concurrent fetches at a time
const DELAY_MS = 2000; // delay between batches to be polite

// ── Helpers ─────────────────────────────────────────────────────────────────

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'GraceMusic-Importer/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Parse the song list HTML to extract unique song slugs + display titles.
 * Returns array of { slug, title, url }
 */
function parseSongList(html) {
  // Match all links like: song.php?title=slug-here
  // The link text is the song title
  const regex = /<a[^>]+href=["'](?:https?:\/\/songsofpraise\.in\/)?song\.php\?title=([^"'&]+)["'][^>]*>(.*?)<\/a>/gis;
  const seen = new Set();
  const songs = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const slug = match[1].trim();
    const rawTitle = match[2].replace(/<[^>]*>/g, '').trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    songs.push({
      slug,
      title: rawTitle || slug.replace(/-/g, ' '),
      url: `${BASE_URL}/song.php?title=${slug}`,
    });
  }
  return songs;
}

/**
 * Parse an individual song page to extract:
 *  - title (from <h1> or page title)
 *  - artist / Words/Music
 *  - originalKey (from the "Scale:" or key indicator if present)
 *  - lyrics (the chord+lyric block inside <pre> or the song content div)
 */
function parseSongPage(html, fallbackTitle) {
  let title = fallbackTitle;
  let artist = 'Unknown';
  let originalKey = '';
  let lyrics = '';

  // ── Title ──
  // Try to get from the <h1> or song title area
  const h1Match = html.match(/<h1[^>]*class="[^"]*song[_-]?title[^"]*"[^>]*>(.*?)<\/h1>/is)
    || html.match(/<h4[^>]*>(.*?)<\/h4>/is);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, '').trim();
  }

  // ── Artist / Words/Music ──
  const artistMatch = html.match(/Words\/Music\s*:\s*(.*?)(?:<|$)/i)
    || html.match(/Songwriter\s*:\s*(.*?)(?:<|$)/i);
  if (artistMatch) {
    artist = artistMatch[1].replace(/<[^>]*>/g, '').trim() || 'Unknown';
  }

  // ── Original Key / Scale ──
  const keyMatch = html.match(/Scale\s*:\s*([A-G][#b]?\s*(?:major|minor|m)?)/i)
    || html.match(/Key\s*:\s*([A-G][#b]?\s*(?:major|minor|m)?)/i)
    || html.match(/data-original-key=["']([A-G][#b]?)["']/i);
  if (keyMatch) {
    originalKey = keyMatch[1].trim();
  }

  // ── Lyrics + Chords ──
  // The site puts lyrics in a <pre> tag or a div with class "song_content" / id "myPre"
  const preMatch = html.match(/<pre[^>]*id=["']myPre["'][^>]*>([\s\S]*?)<\/pre>/i)
    || html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    lyrics = cleanLyrics(preMatch[1]);
  } else {
    // Fallback: try the div.song_content
    const divMatch = html.match(/<div[^>]*class=["'][^"]*song[_-]?content[^"]*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (divMatch) {
      lyrics = cleanLyrics(divMatch[1]);
    }
  }

  return { title, artist, originalKey, lyrics };
}

/**
 * Clean raw HTML lyrics into the chord/lyric text format the app expects.
 * The site uses <span class="c">CHORD</span> for chords inline with lyrics.
 */
function cleanLyrics(raw) {
  // Replace chord spans with [Chord] bracket notation
  let text = raw;
  // Pattern: <span class="c" ...>CHORD</span>  or  <span class='c'>CHORD</span>
  text = text.replace(/<span[^>]*class=["']c["'][^>]*>(.*?)<\/span>/gi, (_, chord) => {
    return `[${chord.trim()}]`;
  });
  // Replace <br> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Trim trailing/leading whitespace per line but keep structure
  text = text.split('\n').map(l => l.trimEnd()).join('\n');
  // Remove excessive blank lines (keep max 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  return text;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  logMsg('🎵 Songs of Praise Hindi → Grace Music Importer');
  logMsg('================================================\n');

  // 1. Connect to MongoDB
  logMsg('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);
  logMsg('✅ Connected to MongoDB\n');

  // 2. Fetch song list
  logMsg('Fetching Hindi song list from songsofpraise.in...');
  const listHtml = await fetchPage(SONG_LIST_URL);
  const songEntries = parseSongList(listHtml);
  logMsg(`✅ Found ${songEntries.length} songs\n`);

  if (songEntries.length === 0) {
    logMsg('❌ No songs found. Dumping fetched HTML to error.html');
    fs.writeFileSync('error.html', listHtml, 'utf8');
    await client.close();
    return;
  }

  // 3. Check for existing songs to skip duplicates
  const existingTitles = new Set();
  const existing = await collection.find(
    { genre: GENRE },
    { projection: { title: 1 } }
  ).toArray();
  existing.forEach(s => existingTitles.add(s.title.toLowerCase()));
  logMsg(`ℹ️  ${existingTitles.size} Hindi songs already in database\n`);

  // 4. Process songs in batches
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < songEntries.length; i += BATCH_SIZE) {
    const batch = songEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        // Check if already exists
        if (existingTitles.has(entry.title.toLowerCase())) {
          skipped++;
          return { status: 'skipped', title: entry.title };
        }

        try {
          const html = await fetchPage(entry.url);
          const songData = parseSongPage(html, entry.title);

          if (!songData.lyrics || songData.lyrics.length < 10) {
            logMsg(`  ⚠️  Skipping "${entry.title}" – no lyrics found`);
            fs.writeFileSync('failed-song.html', html, 'utf8');
            skipped++;
            return { status: 'skipped', title: entry.title };
          }

          const now = new Date();
          const doc = {
            title: songData.title || entry.title,
            artist: songData.artist,
            genre: GENRE,
            lyrics: songData.lyrics,
            createdBy: CREATED_BY,
            createdAt: now,
            updatedAt: now,
          };
          if (songData.originalKey) {
            doc.originalKey = songData.originalKey;
          }

          await collection.insertOne(doc);
          imported++;
          return { status: 'imported', title: doc.title };
        } catch (err) {
    logMsg(`  ❌ Failed "${entry.title}": ${err.message}`);
          failed++;
          return { status: 'failed', title: entry.title };
        }
      })
    );

    // Log progress
    const batchEnd = Math.min(i + BATCH_SIZE, songEntries.length);
    logMsg(`[${batchEnd}/${songEntries.length}] imported: ${imported} | skipped: ${skipped} | failed: ${failed}`);

    // Polite delay
    if (i + BATCH_SIZE < songEntries.length) {
      await sleep(DELAY_MS);
    }
  }

  logMsg('\n================================================');
  logMsg(`✅ Import complete!`);
  logMsg(`   Imported: ${imported}`);
  logMsg(`   Skipped:  ${skipped}`);
  logMsg(`   Failed:   ${failed}`);
  logMsg(`   Total:    ${songEntries.length}`);
  logMsg('================================================');

  await client.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
