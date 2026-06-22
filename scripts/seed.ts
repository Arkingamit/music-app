/**
 * Seed Script for Grace Music App
 * 
 * Populates the MongoDB database with initial data:
 * - Admin and editor users
 * - Sample songs with lyrics
 * - Sample organizations and groups
 * 
 * Usage: npx tsx scripts/seed.ts
 * 
 * Make sure MONGODB_URI is set in your .env.local
 */

import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';

// Load env from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'gracemusic';

async function seed() {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);

    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('songs').deleteMany({});
    await db.collection('organizations').deleteMany({});
    await db.collection('groups').deleteMany({});
    await db.collection('messages').deleteMany({});
    await db.collection('genres').deleteMany({});
    console.log('Cleared existing data');

    // --- Users ---
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = await db.collection('users').insertMany([
      {
        email: 'admin@example.com',
        name: 'Admin User',
        username: 'admin',
        displayName: 'Admin User',
        photoURL: '',
        passwordHash,
        role: 'admin',
        createdAt: new Date(),
      },
      {
        email: 'editor@example.com',
        name: 'Editor User',
        username: 'editor',
        displayName: 'Editor User',
        photoURL: '',
        passwordHash,
        role: 'editor',
        createdAt: new Date(),
      },
    ]);

    const adminId = users.insertedIds[0].toString();
    const editorId = users.insertedIds[1].toString();
    console.log(`Created users: admin (${adminId}), editor (${editorId})`);

    // --- Songs ---
    const songs = await db.collection('songs').insertMany([
      {
        title: 'Living Hope',
        artist: 'Phil Wickham',
        genre: 'Worship',
        lyrics: `[G]How great the [D]chasm that [Em]lay between us\n[C]How high the [G]mountain I [D]could not climb\n[G]In despera[D]tion I [Em]turned to heaven\n[C]And spoke Your [G]name into [D]the night\n\n[G]Then through the [D]darkness Your [Em]loving kindness\n[C]Tore through the [G]shadows of [D]my soul\n[G]The work is [D]finished the [Em]end is written\n[C]Jesus [G]Christ my [D]living hope`,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
        originalKey: 'G',
      },
      {
        title: 'Way Maker',
        artist: 'Sinach',
        genre: 'Worship',
        lyrics: `[E]You are here [B]moving in our midst\n[C#m]I worship [A]You I worship You\n[E]You are here [B]working in this place\n[C#m]I worship [A]You I worship You\n\n[E]Way maker [B]miracle worker\n[C#m]Promise keeper [A]light in the darkness\n[E]My God [B]that is [C#m]who You [A]are`,
        createdBy: editorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        originalKey: 'E',
      },
    ]);

    const song1Id = songs.insertedIds[0].toString();
    const song2Id = songs.insertedIds[1].toString();
    console.log(`Created songs: Living Hope (${song1Id}), Way Maker (${song2Id})`);

    // --- Organizations ---
    const orgs = await db.collection('organizations').insertMany([
      {
        name: 'Grace North',
        description: 'Grace North Church',
        members: [adminId, editorId],
        groups: [],
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Grace Central',
        description: 'Grace Central Church',
        members: [adminId, editorId],
        groups: [],
        createdBy: editorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const org1Id = orgs.insertedIds[0].toString();
    const org2Id = orgs.insertedIds[1].toString();
    console.log(`Created organizations: Grace North (${org1Id}), Grace Central (${org2Id})`);

    // --- Groups ---
    const grps = await db.collection('groups').insertMany([
      {
        name: 'Sunday Worship',
        description: 'Main Sunday worship set',
        organizationId: org1Id,
        members: [adminId, editorId],
        songs: [song1Id, song2Id],
        songTranspositions: [],
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Youth Service',
        description: 'Youth worship set',
        organizationId: org2Id,
        members: [editorId],
        songs: [song2Id],
        songTranspositions: [],
        createdBy: editorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const group1Id = grps.insertedIds[0].toString();
    const group2Id = grps.insertedIds[1].toString();

    // Update organizations with group references
    await db.collection('organizations').updateOne(
      { _id: orgs.insertedIds[0] },
      { $set: { groups: [group1Id] } }
    );
    await db.collection('organizations').updateOne(
      { _id: orgs.insertedIds[1] },
      { $set: { groups: [group2Id] } }
    );
    console.log(`Created groups and linked to organizations`);

    // --- Genres ---
    await db.collection('genres').insertMany([
      { name: 'Worship', createdAt: new Date() },
      { name: 'Hymn', createdAt: new Date() },
      { name: 'Gospel', createdAt: new Date() },
      { name: 'Contemporary', createdAt: new Date() },
    ]);
    console.log('Created genres');

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTest accounts:');
    console.log('  admin@example.com / password123 (admin)');
    console.log('  editor@example.com / password123 (editor)');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
