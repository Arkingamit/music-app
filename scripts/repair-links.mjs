
import fs from 'fs';
import path from 'path';

const rootDir = path.join(process.cwd(), 'src');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const patterns = [
  // Fix double wraps
  { regex: /view\?id=view\?id=/g, replacement: 'view?id=' },
  { regex: /edit\?id=edit\?id=/g, replacement: 'edit?id=' },
  { regex: /edit\?id=view\?id=/g, replacement: 'edit?id=' },
  { regex: /view\?id=edit\?id=/g, replacement: 'view?id=' },
  
  // Fix /new (exclude from query param)
  { regex: /\/songs\/view\?id=new/g, replacement: '/songs/new' },
  { regex: /\/groups\/view\?id=new/g, replacement: '/groups/new' },
  { regex: /\/organizations\/view\?id=new/g, replacement: '/organizations/new' },
];

walk(rootDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    if (filePath.includes('src\\app\\api')) return;

    patterns.forEach(p => {
      content = content.replace(p.regex, p.replacement);
    });

    if (content !== original) {
      console.log(`Repaired ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Repair complete.');
