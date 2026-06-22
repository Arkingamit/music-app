import 'dotenv/config.js';
import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grace-music';

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

    const dbName = process.env.MONGODB_DB_NAME || 'grace-music';
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
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });

      const [keep, ...toDelete] = sortedDocs;
      
      logMsg(`Group: "${group.title}" (${sortedDocs.length} total)`);
      logMsg(`  🟢 Keeping ID: ${keep._id} (Title: "${keep.title}")`);
      
      const idsToDelete = toDelete.map(doc => doc._id);
      logMsg(`  🗑️  Deleting ${idsToDelete.length} duplicates...`);

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
