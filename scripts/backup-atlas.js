const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = "mongodb+srv://gracemusic:Ashish%40123@gracemusic.hwukmyy.mongodb.net/?appName=gracemusic";
const dbName = "gracemusic_backup_2026_06_13";
const backupDir = path.join(__dirname, '..', 'atlas_backup_data');

async function backup() {
  console.log(`Starting backup of database: ${dbName}...`);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Downloading data...`);
    
    let totalDocs = 0;
    
    for (const col of collections) {
      if (col.name.startsWith('system.')) continue;
      
      const docs = await db.collection(col.name).find({}).toArray();
      const filePath = path.join(backupDir, `${col.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      
      console.log(`✅ Backed up ${docs.length} documents from '${col.name}' to ${filePath}`);
      totalDocs += docs.length;
    }
    
    console.log(`\n🎉 Backup completed successfully! A total of ${totalDocs} documents were saved to the 'atlas_backup_data' folder.`);
  } catch (err) {
    console.error("Error during backup:", err);
  } finally {
    await client.close();
  }
}

backup();
