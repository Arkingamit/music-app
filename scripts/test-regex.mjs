import fs from 'fs';

function cleanLyrics(raw) {
  let text = raw;
  text = text.replace(/<span[^>]*class=["']c["'][^>]*>(.*?)<\/span>/gi, (_, chord) => {
    return `[${chord.trim()}]`;
  });
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  text = text.split('\n').map(l => l.trimEnd()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  return text;
}

const html = fs.readFileSync('aaj-ka-din-test.html', 'utf8');
const preMatch = html.match(/<pre[^>]*id=["']myPre["'][^>]*>([\s\S]*?)<\/pre>/i)
    || html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);

const lyrics = cleanLyrics(preMatch[1]);
fs.writeFileSync('test-regex.txt', 'Length: ' + lyrics.length + '\n\n' + lyrics, 'utf8');
