import https from 'https';
import fs from 'fs';

https.get('https://songsofpraise.in/song.php?title=aanandit-raho-prabhu-may', { headers: { 'User-Agent': 'GraceMusic-Importer/1.0' } }, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    fs.writeFileSync('aanandit.html', data, 'utf8');
    const html = data;
    const preMatch = html.match(/<pre[^>]*id=["']myPre["'][^>]*>([\s\S]*?)<\/pre>/i)
        || html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      fs.writeFileSync('aanandit-log.txt', 'Match Length: ' + preMatch[1].length, 'utf8');
    } else {
      fs.writeFileSync('aanandit-log.txt', 'NO MATCH!', 'utf8');
    }
  });
});
