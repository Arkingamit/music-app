/**
 * Scraper script for Songs of Praise – English songs
 * Usage: node scripts/scrape-english-songs.mjs
 *
 * This script:
 *  1. Fetches the English song list page from songsofpraise.in
 *  2. Extracts all individual song URLs
 *  3. Fetches each song page, extracting title, artist, original key, and lyrics+chords
 *  4. Inserts the songs directly into MongoDB (same DB the app uses)
 */

import { MongoClient } from 'mongodb';
import https from 'https';
import http from 'http';
import fs from 'fs';

const LOG_FILE = 'scrape-english-results.txt';
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
const SONG_LIST_URL = `${BASE_URL}/songlist.php?song_lang=English`;
const GENRE = 'English';
const CREATED_BY = 'songs-of-praise-english-import'; 
const BATCH_SIZE = 1; 
const DELAY_MS = 2000; 

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

function parseSongList(html) {
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

function parseSongPage(html, fallbackTitle) {
  let title = fallbackTitle;
  let artist = 'Unknown';
  let originalKey = '';
  let lyrics = '';

  const h1Match = html.match(/<h1[^>]*class="[^"]*song[_-]?title[^"]*"[^>]*>(.*?)<\/h1>/is)
    || html.match(/<h4[^>]*>(.*?)<\/h4>/is);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]*>/g, '').trim();
  }

  const artistMatch = html.match(/Words\/Music\s*:\s*(.*?)(?:<|$)/i)
    || html.match(/Songwriter\s*:\s*(.*?)(?:<|$)/i);
  if (artistMatch) {
    artist = artistMatch[1].replace(/<[^>]*>/g, '').trim() || 'Unknown';
  }

  const keyMatch = html.match(/Scale\s*:\s*([A-G][#b]?\s*(?:major|minor|m)?)/i)
    || html.match(/Key\s*:\s*([A-G][#b]?\s*(?:major|minor|m)?)/i)
    || html.match(/data-original-key=["']([A-G][#b]?)["']/i);
  if (keyMatch) {
    originalKey = keyMatch[1].trim();
  }

  const preMatch = html.match(/<pre[^>]*id=["']myPre["'][^>]*>([\s\S]*?)<\/pre>/i)
    || html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    lyrics = cleanLyrics(preMatch[1]);
  } else {
    const divMatch = html.match(/<div[^>]*class=["'][^"]*song[_-]?content[^"]*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (divMatch) {
      lyrics = cleanLyrics(divMatch[1]);
    }
  }

  return { title, artist, originalKey, lyrics };
}

function cleanLyrics(raw) {
  let text = raw;
  text = text.replace(/<span[^>]*class=["']c["'][^>]*>(.*?)<\/span>/gi, (_, chord) => {
    return `[${chord.trim()}]`;
  });
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  text = text.split('\n').map(l => l.trimEnd()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  return text;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  logMsg('🎵 Songs of Praise English → Grace Music Importer');
  logMsg('================================================\n');

  logMsg('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);
  logMsg('✅ Connected to MongoDB\n');

  logMsg('Fetching English song list from songsofpraise.in...');
  const listHtml = await fetchPage(SONG_LIST_URL);
  const songEntries = parseSongList(listHtml);
  logMsg(`✅ Found ${songEntries.length} songs\n`);

  if (songEntries.length === 0) {
    logMsg('❌ No songs found. Dumping fetched HTML to english-error.html');
    fs.writeFileSync('english-error.html', listHtml, 'utf8');
    await client.close();
    return;
  }

  const existingTitles = new Set();
  const existing = await collection.find(
    { genre: GENRE },
    { projection: { title: 1 } }
  ).toArray();
  existing.forEach(s => existingTitles.add(s.title.toLowerCase()));
  logMsg(`ℹ️  ${existingTitles.size} English songs already in database\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < songEntries.length; i += BATCH_SIZE) {
    const batch = songEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        if (existingTitles.has(entry.title.toLowerCase())) {
          skipped++;
          return { status: 'skipped', title: entry.title };
        }

        try {
          const html = await fetchPage(entry.url);
          const songData = parseSongPage(html, entry.title);

          if (!songData.lyrics || songData.lyrics.length < 10) {
            logMsg(`  ⚠️  Skipping "${entry.title}" – no lyrics found`);
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

    const batchEnd = Math.min(i + BATCH_SIZE, songEntries.length);
    logMsg(`[${batchEnd}/${songEntries.length}] imported: ${imported} | skipped: ${skipped} | failed: ${failed}`);

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
