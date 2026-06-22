
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
  { regex: /\/songs\/\$\{([a-zA-Z0-9_.-]+)\}\/edit/g, replacement: '/songs/edit?id=${$1}' },
  { regex: /\/songs\/\$\{([a-zA-Z0-9_.-]+)\}/g, replacement: '/songs/view?id=${$1}' },
  { regex: /\/groups\/\$\{([a-zA-Z0-9_.-]+)\}\/edit/g, replacement: '/groups/edit?id=${$1}' },
  { regex: /\/groups\/\$\{([a-zA-Z0-9_.-]+)\}/g, replacement: '/groups/view?id=${$1}' },
  { regex: /\/organizations\/\$\{([a-zA-Z0-9_.-]+)\}\/edit/g, replacement: '/organizations/edit?id=${$1}' },
  { regex: /\/organizations\/\$\{([a-zA-Z0-9_.-]+)\}/g, replacement: '/organizations/view?id=${$1}' },
  { regex: /\/songs\/([a-zA-Z0-9_.-]+)\/edit/g, replacement: '/songs/edit?id=$1' },
  { regex: /\/songs\/([a-zA-Z0-9_.-]+)/g, replacement: '/songs/view?id=$1' },
  { regex: /\/groups\/([a-zA-Z0-9_.-]+)\/edit/g, replacement: '/groups/edit?id=$1' },
  { regex: /\/groups\/([a-zA-Z0-9_.-]+)/g, replacement: '/groups/view?id=$1' },
  { regex: /\/organizations\/([a-zA-Z0-9_.-]+)\/edit/g, replacement: '/organizations/edit?id=$1' },
  { regex: /\/organizations\/([a-zA-Z0-9_.-]+)/g, replacement: '/organizations/view?id=$1' },
];

walk(rootDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Skip the view components we already refactored manually or handled specially
    // Also skip /api routes if any
    if (filePath.includes('src\\app\\api')) return;

    patterns.forEach(p => {
      content = content.replace(p.regex, p.replacement);
    });

    if (content !== original) {
      console.log(`Updated ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Link migration complete.');
