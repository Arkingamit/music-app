import fs from 'fs';
import path from 'path';

const FLAG_FILE = path.join(process.cwd(), 'setup_complete.flag');

/**
 * Check if the initial setup has been completed.
 * Uses a simple file-based flag in the project root.
 */
export function isSetupComplete(): boolean {
  try {
    return fs.existsSync(FLAG_FILE);
  } catch {
    return false;
  }
}

/**
 * Mark setup as complete by writing a flag file.
 */
export function markSetupComplete(): void {
  fs.writeFileSync(FLAG_FILE, JSON.stringify({
    completedAt: new Date().toISOString(),
    version: '1.0'
  }), 'utf-8');
}
