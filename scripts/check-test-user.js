
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('gracemusic');
    const user = await db.collection('users').findOne({ email: 'test@gmail.com' });
    if (!user) {
      console.log('test@gmail.com not found');
      return;
    }
    console.log('User role:', user.role, 'User ID:', user._id.toString());
    const orgs = await db.collection('organizations').find({}).toArray();
    
    console.log('\n--- ORGANIZATIONS REPORT ---');
    for (const org of orgs) {
      const isManager = org.managerId === user._id.toString();
      const isMember = org.members && org.members.includes(user._id.toString());
      if (isManager || isMember) {
        console.log(`- ${org.name}: manager? ${isManager}, member? ${isMember}`);
      } else {
        console.log(`- ${org.name}: NOT MEMBER NOT MANAGER`);
      }
    }
    console.log('----------------------------\n');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
