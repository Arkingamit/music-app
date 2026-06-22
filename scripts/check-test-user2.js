
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('gracemusic');
    
    console.log("USERS:");
    const users = await db.collection('users').find({}).toArray();
    for (const u of users) {
      console.log(`- ${u.email} (ID: ${u._id.toString()}, role: ${u.role})`);
    }

    const testUser = users.find(u => u.email === 'test@gmail.com');
    if (!testUser) {
      console.log("test@gmail.com NOT FOUND.");
      return;
    }
    
    console.log("\nORGANIZATIONS for " + testUser._id.toString() + ":");
    const orgs = await db.collection('organizations').find({}).toArray();
    for (const org of orgs) {
      const isManager = org.managerId === testUser._id.toString();
      const isMember = org.members && org.members.map(m=>m.toString()).includes(testUser._id.toString());
      console.log(`- ${org.name}: manager? ${isManager}, member? ${isMember}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
