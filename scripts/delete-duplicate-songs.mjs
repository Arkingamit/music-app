import 'dotenv/config.js';
import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';

const uri = 'mongodb+srv://gracemusic:Ashish%40123@gracemusic.hwukmyy.mongodb.net/?appName=gracemusic';

let logOutput = "";
function logMsg(msg) {
  logOutput += msg + "\n";
  console.log(msg);
}

if (!uri) {
  console.error("Please provide MONGODB_URI in .env.local file.");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    logMsg("Connected to MongoDB!");

    const dbName = 'gracemusic';
    const db = client.db(dbName);
    const songsCollection = db.collection('songs');

    // Fetch all songs
    const allSongs = await songsCollection.find({}).toArray();
    logMsg(`Fetched ${allSongs.length} total songs.`);

    const duplicatesMap = new Map();

    for (const song of allSongs) {
      if (!song.title) continue;
      // Normalize the title by trimming, converting to lowercase, and replacing multiple spaces with single
      const normalizedTitle = song.title.trim().toLowerCase().replace(/\s+/g, ' ');

      if (!duplicatesMap.has(normalizedTitle)) {
        duplicatesMap.set(normalizedTitle, []);
      }
      duplicatesMap.get(normalizedTitle).push(song);
    }

    const duplicates = [];
    for (const [title, docs] of duplicatesMap.entries()) {
      if (docs.length > 1) {
        duplicates.push({ title, docs });
      }
    }

    if (duplicates.length === 0) {
      logMsg("✅ No duplicate songs found!");
      fs.writeFileSync('delete-report.txt', logOutput, 'utf8');
      return;
    }

    logMsg(`Found ${duplicates.length} titles with duplicates.\n`);

    let totalDeleted = 0;

    for (const group of duplicates) {
      const sortedDocs = group.docs.sort((a, b) => {
        // Priority 1: Keep non-English songs (delete English ones first)
        // genre can be a string or string[] depending on when the song was created
        const genresA = Array.isArray(a.genre) ? a.genre : (a.genre ? [a.genre] : []);
        const genresB = Array.isArray(b.genre) ? b.genre : (b.genre ? [b.genre] : []);
        const isAEnglish = genresA.some(g => g === 'English');
        const isBEnglish = genresB.some(g => g === 'English');
        if (isAEnglish !== isBEnglish) {
          return isAEnglish ? 1 : -1; // English moves to the end of the list (to be deleted)
        }

        // Priority 2: Keep oldest
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

      const [keep, ...toDelete] = sortedDocs;

      logMsg(`Group: "${group.title}" (${sortedDocs.length} total)`);
      const keepGenre = Array.isArray(keep.genre) ? keep.genre.join(', ') : keep.genre;
      logMsg(`  🟢 Keeping ID: ${keep._id} (Title: "${keep.title}", Genre: "${keepGenre}")`);

      const idsToDelete = toDelete.map(doc => doc._id);
      toDelete.forEach(doc => {
        const delGenre = Array.isArray(doc.genre) ? doc.genre.join(', ') : doc.genre;
        logMsg(`  🔴 Deleting ID: ${doc._id} (Title: "${doc.title}", Genre: "${delGenre}")`);
      });

      const deleteResult = await songsCollection.deleteMany({
        _id: { $in: idsToDelete }
      });

      totalDeleted += deleteResult.deletedCount;
      logMsg(`  ✅ Successfully deleted ${deleteResult.deletedCount} items.\n`);
    }

    logMsg(`=================================`);
    logMsg(`🎉 Cleanup complete!`);
    logMsg(`Total duplicate songs deleted: ${totalDeleted}`);
    logMsg(`=================================`);

    fs.writeFileSync('delete-report.txt', logOutput, 'utf8');

  } catch (error) {
    console.error("Error connecting or processing:", error);
  } finally {
    await client.close();
  }
}

run();
