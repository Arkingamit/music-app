import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');

// Helper for logging
function logMsg(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const formattedMsg = `[${timestamp}] ${msg}`;
  console.log(formattedMsg);
  // Using appendFileSync ensures that we don't lose logs if the script crashes
  fs.appendFileSync('gemini-update-log.txt', formattedMsg + '\n');
}

// Initial log to confirm the script is started
logMsg("--------------------------------------------------");
logMsg("🚀 Script execution started.");
logMsg("--------------------------------------------------");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logMsg("✅ Loaded .env.local");
} else {
  logMsg("⚠️ .env.local not found, using process.env");
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'gracemusic';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function detectKeyWithGemini(model, songTitle, lyrics) {
  const prompt = `
    Identify the original musical key (e.g. C, G, Eb, F#m, Ab) for the following song: "${songTitle}".
    Base your decision on the lyrics and chords provided below.
    
    Return ONLY the key name (e.g. "G" or "Bb"). Do not include any extra text. If you are unsure, return "C".
    
    Lyrics & Chords:
    ${lyrics.substring(0, 5000)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    // Use regex to get the key name only
    const match = text.match(/([A-G][#b]?[m]?)/);
    return match ? match[1] : "C";
  } catch (error) {
    logMsg(`Error detecting key for "${songTitle}": ${error.message}`);
    return null;
  }
}

async function run() {
  if (!MONGODB_URI) {
    logMsg("❌ MONGODB_URI is not defined.");
    process.exit(1);
  }
  if (!GEMINI_API_KEY) {
    logMsg("❌ GEMINI_API_KEY is not defined.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const client = new MongoClient(MONGODB_URI);

  try {
    logMsg("📡 Connecting to MongoDB...");
    await client.connect();
    logMsg("✅ Connected!");

    const db = client.db(MONGODB_DB_NAME);
    const songsCollection = db.collection('songs');

    const allSongs = await songsCollection.find({}).toArray();
    logMsg(`🔢 Found ${allSongs.length} songs to process.`);

    let updatedCount = 0;
    
    for (let i = 0; i < allSongs.length; i++) {
      const song = allSongs[i];
      logMsg(`👉 Processing (${i + 1}/${allSongs.length}): "${song.title}"`);

      const detectedKey = await detectKeyWithGemini(model, song.title, song.lyrics);

      if (detectedKey) {
        await songsCollection.updateOne(
          { _id: song._id },
          { $set: { originalKey: detectedKey, updatedAt: new Date().toISOString() } }
        );
        logMsg(`   ✨ Detected Key: ${detectedKey}`);
        updatedCount++;
      } else {
        logMsg(`   ⚠️ Key detection failed for this song.`);
      }

      // Small delay to prevent rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    logMsg("--------------------------------------------------");
    logMsg(`🏁 All Done! Updated ${updatedCount} songs.`);
    logMsg("--------------------------------------------------");
  } catch (error) {
    logMsg(`❌ Fatal Error: ${error.message}`);
  } finally {
    await client.close();
    logMsg("🔌 DB connection closed.");
  }
}

run().catch(err => {
  logMsg(`❌ Unhandled Error: ${err.message}`);
  process.exit(1);
});
