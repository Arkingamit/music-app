
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('gracemusic');
    
    // 1. Migrate roles: 'admin' -> 'super_admin'
    const userResult = await db.collection('users').updateMany(
      { role: 'admin' },
      { $set: { role: 'super_admin' } }
    );
    console.log(`Migrated ${userResult.modifiedCount} users from 'admin' to 'super_admin'`);

    // 2. Backfill managerId in organizations
    const orgs = await db.collection('organizations').find({ managerId: { $exists: false } }).toArray();
    console.log(`Found ${orgs.length} organizations missing managerId`);
    
    for (const org of orgs) {
      await db.collection('organizations').updateOne(
        { _id: org._id },
        { $set: { managerId: org.createdBy } }
      );
    }
    console.log(`Backfilled managerId for ${orgs.length} organizations`);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.close();
  }
}

migrate();
