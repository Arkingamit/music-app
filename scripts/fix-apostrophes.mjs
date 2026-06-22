/**
 * Fix HTML-encoded apostrophes in song lyrics
 * Replaces all occurrences of &#039; with '
 * 
 * Usage: node scripts/fix-apostrophes.mjs
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://gracemusic:Ashish%40123@gracemusic.hwukmyy.mongodb.net/?appName=gracemusic';
const DB_NAME = 'gracemusic';
const COLLECTION = 'songs';

async function main() {
  console.log('🔧 Fixing &#039; → \' in song lyrics...\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  // Find all songs whose lyrics contain &#039;
  const songsToFix = await collection.find({
    lyrics: { $regex: '&#039;' }
  }).toArray();

  console.log(`Found ${songsToFix.length} songs with &#039; in lyrics.\n`);

  if (songsToFix.length === 0) {
    console.log('✅ Nothing to fix!');
    await client.close();
    return;
  }

  let fixed = 0;
  for (const song of songsToFix) {
    const originalLyrics = song.lyrics;
    const fixedLyrics = originalLyrics.replace(/&#039;/g, "'");

    await collection.updateOne(
      { _id: song._id },
      { $set: { lyrics: fixedLyrics, updatedAt: new Date() } }
    );

    fixed++;
    console.log(`  ✅ Fixed: "${song.title}"`);
  }

  // Also fix titles that may contain &#039;
  const titlesToFix = await collection.find({
    title: { $regex: '&#039;' }
  }).toArray();

  if (titlesToFix.length > 0) {
    console.log(`\nFound ${titlesToFix.length} songs with &#039; in titles.\n`);
    for (const song of titlesToFix) {
      const fixedTitle = song.title.replace(/&#039;/g, "'");
      await collection.updateOne(
        { _id: song._id },
        { $set: { title: fixedTitle, updatedAt: new Date() } }
      );
      console.log(`  ✅ Fixed title: "${fixedTitle}"`);
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Done! Fixed ${fixed} song lyrics.`);
  console.log(`========================================`);

  await client.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
