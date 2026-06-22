import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testFetch() {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    fs.writeFileSync('api-debug.json', JSON.stringify(data, null, 2));
    console.log("API check complete.");
  } catch (e) {
    fs.writeFileSync('api-debug.json', JSON.stringify({ error: e.message }, null, 2));
  }
}

testFetch();
