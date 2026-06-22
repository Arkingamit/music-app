
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'scripts', 'log.txt');
const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

fs.writeFileSync(logFile, 'Starting mobileify (surgical)...\n');

const rootDir = process.cwd();
const apiPath = path.join(rootDir, 'src', 'app', 'api');
const adminPagePath = path.join(rootDir, 'src', 'app', 'admin', 'page.tsx');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

try {
  // 1. Surgical rename of route files
  if (fs.existsSync(apiPath)) {
    log('Processing API directory surgically...');
    walk(apiPath, (filePath) => {
      const fileName = path.basename(filePath);
      if ((fileName === 'route.ts' || fileName === 'route.js') && !fileName.startsWith('_')) {
        const newPath = path.join(path.dirname(filePath), '_' + fileName);
        log(`Renaming ${filePath} -> ${newPath}`);
        fs.renameSync(filePath, newPath);
      }
    });
    log('API routes hidden.');
  }

  // 2. Disable force-dynamic in Admin Page
  if (fs.existsSync(adminPagePath)) {
    log('Disabling "force-dynamic" in admin page...');
    let content = fs.readFileSync(adminPagePath, 'utf8');
    const target = 'export const dynamic = "force-dynamic";';
    if (content.includes(target)) {
      content = content.replace(target, '// export const dynamic = "force-dynamic"; // Disabled for mobile build');
      fs.writeFileSync(adminPagePath, content);
      log('Admin page updated.');
    }
  }

  log('Mobileify complete.');
} catch (err) {
  log('ERROR: ' + err.message);
  process.exit(1);
}
