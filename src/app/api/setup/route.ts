import { NextRequest } from 'next/server';
import { isSetupComplete, markSetupComplete } from '@/lib/setup-flag';
import fs from 'fs';
import path from 'path';

// GET /api/setup — Check setup status and environment
export async function GET() {
  try {
    const setupDone = isSetupComplete();
    if (setupDone) {
      return Response.json({ setupComplete: true });
    }

    // Check what's currently configured
    const envPath = path.join(process.cwd(), '.env.local');
    let envExists = false;
    let envContent: Record<string, string> = {};

    if (fs.existsSync(envPath)) {
      envExists = true;
      const raw = fs.readFileSync(envPath, 'utf-8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const value = trimmed.substring(eqIdx + 1).trim();
            envContent[key] = value;
          }
        }
      }
    }

    // Check MongoDB connectivity
    let mongoStatus = 'unknown';
    try {
      const { MongoClient } = await import('mongodb');
      const uri = envContent.MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      mongoStatus = 'connected';
    } catch (e: any) {
      mongoStatus = `error: ${e.message}`;
    }

    // Check Node.js version
    const nodeVersion = process.version;

    return Response.json({
      setupComplete: false,
      envExists,
      currentConfig: {
        MONGODB_URI: envContent.MONGODB_URI ? '(set)' : '(not set)',
        MONGODB_DB_NAME: envContent.MONGODB_DB_NAME || '(not set)',
        JWT_SECRET: envContent.JWT_SECRET ? '(set)' : '(not set)',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: envContent.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '(not set)',
        GROQ_API_KEY: envContent.GROQ_API_KEY ? '(set)' : '(not set)',
      },
      mongoStatus,
      nodeVersion,
    });
  } catch (error) {
    console.error('Setup status error:', error);
    return Response.json({ error: 'Failed to check setup status' }, { status: 500 });
  }
}

// POST /api/setup — Save configuration and complete setup
export async function POST(request: NextRequest) {
  try {
    if (isSetupComplete()) {
      return Response.json({ error: 'Setup already completed. Delete setup_complete.flag to re-run.' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Action: save-env — Write .env.local file
    if (action === 'save-env') {
      const { config } = body;
      if (!config) {
        return Response.json({ error: 'Config object is required' }, { status: 400 });
      }

      const envLines = [
        '# Setup Flag (do not remove)',
        'SETUP_COMPLETE=true',
        '',
        '# MongoDB (Local Server)',
        `MONGODB_URI=${config.MONGODB_URI || 'mongodb://localhost:27017'}`,
        `MONGODB_DB_NAME=${config.MONGODB_DB_NAME || 'gracemusic'}`,
        '',
        '# JWT Secret',
        `JWT_SECRET=${config.JWT_SECRET || 'change-me-to-a-strong-random-string'}`,
        '',
        '# Google OAuth',
        `NEXT_PUBLIC_GOOGLE_CLIENT_ID=${config.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}`,
        '',
        '# Groq API Key',
        `GROQ_API_KEY=${config.GROQ_API_KEY || ''}`,
        '',
        '# Gemini API Keys (optional)',
        `GEMINI_API_KEY=${config.GEMINI_API_KEY || ''}`,
        `GOOGLE_GENERATIVE_AI_API_KEY=${config.GOOGLE_GENERATIVE_AI_API_KEY || ''}`,
        '',
        '# Server Domain',
        `NEXT_PUBLIC_DOMAIN=${config.NEXT_PUBLIC_DOMAIN || ''}`,
        '',
      ];

      const envPath = path.join(process.cwd(), '.env.local');
      fs.writeFileSync(envPath, envLines.join('\n'), 'utf-8');

      return Response.json({ success: true, message: '.env.local saved successfully' });
    }

    // Action: test-mongo — Test MongoDB connection
    if (action === 'test-mongo') {
      const { uri, dbName } = body;
      try {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient(uri || 'mongodb://localhost:27017', {
          serverSelectionTimeoutMS: 5000
        });
        await client.connect();
        const db = client.db(dbName || 'gracemusic');
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Get document counts for each collection
        const stats: Record<string, number> = {};
        for (const name of collectionNames) {
          stats[name] = await db.collection(name).countDocuments();
        }

        await client.close();
        return Response.json({ 
          success: true, 
          collections: collectionNames,
          documentCounts: stats,
          message: `Connected! Found ${collectionNames.length} collections.` 
        });
      } catch (e: any) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
      }
    }

    // Action: migrate-db — Run mongorestore from a dump folder
    if (action === 'migrate-db') {
      const { dumpPath, sourceDbName, targetUri, targetDbName } = body;
      
      if (!dumpPath) {
        return Response.json({ error: 'Dump path is required' }, { status: 400 });
      }

      // Validate dump path exists
      const fullDumpPath = path.resolve(dumpPath, sourceDbName || '');
      if (!fs.existsSync(fullDumpPath)) {
        return Response.json({ 
          error: `Dump path not found: ${fullDumpPath}. Run "mongodump" first.` 
        }, { status: 400 });
      }

      // Run mongorestore command
      const { execSync } = await import('child_process');
      try {
        const uri = targetUri || 'mongodb://localhost:27017';
        const db = targetDbName || 'gracemusic';
        const cmd = `mongorestore --uri="${uri}" --db=${db} --drop "${fullDumpPath}"`;
        
        const output = execSync(cmd, { 
          encoding: 'utf-8', 
          timeout: 120000,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        return Response.json({ 
          success: true, 
          message: `Database restored to ${db} successfully!`,
          output 
        });
      } catch (e: any) {
        return Response.json({ 
          success: false, 
          error: e.stderr || e.message 
        }, { status: 500 });
      }
    }

    // Action: complete — Mark setup as finished
    if (action === 'complete') {
      markSetupComplete();
      return Response.json({ 
        success: true, 
        message: 'Setup completed! Restart the server to apply new environment variables.' 
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Setup action error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
