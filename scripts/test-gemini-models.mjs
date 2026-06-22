import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let output = "";
  
  const testModel = async (name) => {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent("Hi");
      output += `✅ Success with ${name}: ${result.response.text().substring(0, 20)}...\n`;
    } catch (e) {
      output += `❌ Error with ${name}: ${e.message}\n`;
    }
  };

  await testModel("gemini-1.5-flash");
  await testModel("gemini-1.5-pro");
  await testModel("gemini-pro");

  fs.writeFileSync('model-test-results.txt', output);
}

listModels();
