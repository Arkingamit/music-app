const { execSync } = require('child_process');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse CLI arguments
const args = process.argv.slice(2);
let sourceUri = '';
let sourceDbName = '';

args.forEach(arg => {
  if (arg.startsWith('--uri=')) sourceUri = arg.substring(6);
  if (arg.startsWith('--db=')) sourceDbName = arg.substring(5);
});

// Remove surrounding quotes if user accidentally pasted them
sourceUri = sourceUri.replace(/^["']|["']$/g, '');
sourceDbName = sourceDbName.replace(/^["']|["']$/g, '');

if (!sourceUri || !sourceDbName) {
  console.error('Usage: node scripts/setup-mongodb.js --uri="<atlas-uri>" --db="<source-db-name>"');
  process.exit(1);
}

const LOCAL_URI = 'mongodb://localhost:27017';
const TARGET_DB_NAME = 'gracemusic';

async function checkMongoRunning() {
  console.log('Checking if MongoDB is already running locally on port 27017...');
  try {
    const client = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 2000 });
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    await client.close();
    console.log('✅ MongoDB is running locally!');
    return true;
  } catch (err) {
    console.log('❌ MongoDB is not reachable on localhost:27017.');
    return false;
  }
}

function installWindows() {
  console.log('Installing MongoDB on Windows...');
  const msiUrl = 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi';
  const msiPath = path.join(os.tmpdir(), 'mongodb.msi');
  
  console.log('Downloading MongoDB installer (this might take a minute)...');
  execSync(`powershell -Command "Invoke-WebRequest -Uri '${msiUrl}' -OutFile '${msiPath}'"`, { stdio: 'inherit' });
  
  console.log('Running silent installation (This may prompt for Administrator privileges)...');
  try {
    execSync(`msiexec.exe /q /i "${msiPath}" ADDLOCAL=ServerService`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Installation failed. Did you decline the Administrator prompt?');
    throw e;
  }
  
  console.log('✅ Installation complete. Trying to start MongoDB service...');
  try {
    execSync('net start MongoDB', { stdio: 'inherit' });
  } catch (e) {
    console.log('Service might already be running or name differs.');
  }
}

function installUbuntu() {
  console.log('Installing MongoDB on Ubuntu/Linux...');
  console.log('Running apt-get update & install...');
  
  const commands = [
    'sudo apt-get install -y gnupg curl',
    'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg',
    'echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list',
    'sudo apt-get update',
    'sudo apt-get install -y mongodb-org',
    'sudo systemctl start mongod',
    'sudo systemctl enable mongod'
  ];

  for (const cmd of commands) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
  }
  console.log('✅ Installation complete.');
}

async function migrateData() {
  console.log(`\nConnecting to Atlas URI...`);
  const sourceClient = new MongoClient(sourceUri, { serverSelectionTimeoutMS: 10000 });
  await sourceClient.connect();
  const sourceDb = sourceClient.db(sourceDbName);
  
  console.log(`Connecting to local MongoDB...`);
  const targetClient = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 10000 });
  await targetClient.connect();
  const targetDb = targetClient.db(TARGET_DB_NAME);
  
  console.log(`Fetching collections from ${sourceDbName}...`);
  const collections = await sourceDb.listCollections().toArray();
  let totalDocs = 0;
  let copiedCollections = 0;
  
  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;
    
    process.stdout.write(`Copying collection '${colName}'... `);
    const docs = await sourceDb.collection(colName).find({}).toArray();
    if (docs.length > 0) {
      try { await targetDb.dropCollection(colName); } catch(e) { }
      await targetDb.collection(colName).insertMany(docs);
      totalDocs += docs.length;
      copiedCollections++;
      console.log(`✅ (${docs.length} docs)`);
    } else {
      console.log(`(0 docs)`);
    }
  }
  
  await sourceClient.close();
  await targetClient.close();
  
  console.log(`\n🎉 Database migrated successfully! Copied ${copiedCollections} collections (${totalDocs} documents) to ${TARGET_DB_NAME}.`);
}

async function main() {
  console.log('=== Grace Music MongoDB Auto-Setup ===\n');
  
  const isRunning = await checkMongoRunning();
  
  if (!isRunning) {
    if (process.platform === 'win32') {
      installWindows();
    } else if (process.platform === 'linux') {
      installUbuntu();
    } else {
      console.error(`Unsupported platform: ${process.platform}. Please install MongoDB manually.`);
      process.exit(1);
    }
    
    console.log('Waiting 5 seconds for MongoDB to start...');
    await new Promise(r => setTimeout(r, 5000));
    
    const isRunningNow = await checkMongoRunning();
    if (!isRunningNow) {
      console.error('Failed to connect to local MongoDB even after installation.');
      process.exit(1);
    }
  }
  
  await migrateData();
}

main().catch(console.error);
