import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { detectKey } from '../src/lib/keyDetection';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const uri = process.env.MONGODB_URI as string;
if (!uri) throw new Error("Missing MONGODB_URI");

async function main() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || 'gracemusic';
  const db = client.db(dbName);
  const collection = db.collection('songs');

  const songs = await collection.find({}).toArray();
  console.log(`Found ${songs.length} songs. Starting backfill...`);

  let updatedCount = 0;

  for (const song of songs) {
    if (!song.lyrics) continue;
    
    // Always recalculate to ensure they use the newly improved algorithm
    const detectedKey = detectKey(song.lyrics);
    
    if (detectedKey && (song.originalKey !== detectedKey)) {
      await collection.updateOne(
        { _id: song._id },
        { $set: { originalKey: detectedKey } }
      );
      updatedCount++;
      console.log(`Updated song "${song.title}" -> Key: ${detectedKey}`);
    }
  }

  console.log(`\nFinished! Successfully updated ${updatedCount} songs.`);
  await client.close();
}

main().catch(console.error);
