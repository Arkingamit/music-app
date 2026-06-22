
import fs from 'fs';
import path from 'path';

const apiPath = path.join(process.cwd(), 'src', 'app', 'api');

const walk = (dir, callback) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

if (fs.existsSync(apiPath)) {
  walk(apiPath, (filePath) => {
    if (filePath.match(/_*route\.(ts|js)$/)) {
      const newPath = filePath.replace(/_*route\.(ts|js)$/, 'route.$1');
      if (filePath !== newPath) {
        console.log(`Repairing ${filePath} -> ${newPath}`);
        fs.renameSync(filePath, newPath);
      }
    }
  });
}
console.log('API Repair complete.');
