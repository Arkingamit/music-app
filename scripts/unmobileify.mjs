
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'scripts', 'log.txt');
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

fs.writeFileSync(logFile, 'Starting unmobileify (surgical)...\n');

const rootDir = process.cwd();
const apiPath = path.join(rootDir, 'src', 'app', 'api');
const adminPagePath = path.join(rootDir, 'src', 'app', 'admin', 'page.tsx');

const walk = (dir, callback) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

try {
  // 1. Restore renamed route files
  if (fs.existsSync(apiPath)) {
    log('Restoring API routes surgically...');
    walk(apiPath, (filePath) => {
      const fileName = path.basename(filePath);
      if (fileName === '_route.ts' || fileName === '_route.js') {
        const newPath = path.join(path.dirname(filePath), fileName.substring(1));
        log(`Restoring ${filePath} -> ${newPath}`);
        fs.renameSync(filePath, newPath);
      }
    });
  }

  // 2. Enable force-dynamic in Admin Page
  if (fs.existsSync(adminPagePath)) {
    log('Restoring "force-dynamic" in admin page...');
    let content = fs.readFileSync(adminPagePath, 'utf8');
    const target = '// export const dynamic = "force-dynamic"; // Disabled for mobile build';
    if (content.includes(target)) {
      content = content.replace(target, 'export const dynamic = "force-dynamic";');
      fs.writeFileSync(adminPagePath, content);
      log('Admin page restored.');
    }
  }

  log('Unmobileify complete.');
} catch (err) {
  log('ERROR: ' + err.message);
  process.exit(1);
}
