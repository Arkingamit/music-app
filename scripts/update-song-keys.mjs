/**
 * Migration script: Re-detect and update originalKey for ALL songs.
 * Uses the updated detectKey algorithm that returns minor keys
 * (e.g. "Am" instead of "C") when the first chord is minor.
 *
 * Usage: node scripts/update-song-keys.mjs
 */

import { MongoClient } from 'mongodb';
import { Scale, Chord, Note } from '@tonaljs/tonal';

const MONGODB_URI = 'mongodb+srv://gracemusic:Ashish%40123@gracemusic.hwukmyy.mongodb.net/?appName=gracemusic';
const DB_NAME = 'gracemusic';
const COLLECTION = 'songs';

// ─── Chord detection (inline copy of chordParser + keyDetection) ───

const CHORD_REGEX = /\b[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|6|7|9|11|13)?(?:\/[A-G](?:#|b)?)?\b/;
const SECTION_HEADER_REGEX = /^\[?(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Instrumental|Solo|Tag|End|Interlude|Ending).*\]?$/i;
const SECTION_LABELS = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'instrumental', 'tag', 'interlude', 'pre-chorus', 'ending', 'end', 'solo'];

function convertToChordPro(rawText) {
  if (!rawText) return '';
  const lines = rawText.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].replace(/\r$/, '');

    if (line.trim().length === 0) {
      result.push('');
      i++;
      continue;
    }

    if (SECTION_HEADER_REGEX.test(line.trim())) {
      const cleanHeader = line.trim().replace(/^\[|\]$/g, '');
      result.push(cleanHeader);
      i++;
      continue;
    }

    if (i + 1 < lines.length && CHORD_REGEX.test(line)) {
      const nextLine = lines[i + 1];
      const tokens = line.trim().split(/\s+/);
      const allTokensAreChords = tokens.length > 0 && tokens.every(token => {
        const clean = token.replace(/^\[|\]$/g, '');
        return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|6|7|9|11|13)*(?:\/[A-G](?:#|b)?)?$/.test(clean);
      });

      if (allTokensAreChords) {
        result.push(mergeChordsInline(line, nextLine));
        i += 2;
        continue;
      }
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

function mergeChordsInline(chordLine, lyricLine) {
  const chordPositions = [];
  const tokens = chordLine.split(/(\s+)/);
  let cursor = 0;

  for (const token of tokens) {
    if (token.trim().length > 0) {
      chordPositions.push({ chord: token, position: cursor });
    }
    cursor += token.length;
  }

  const maxPos = chordPositions.length > 0 ? chordPositions[chordPositions.length - 1].position : 0;
  let merged = lyricLine;
  if (merged.length < maxPos) {
    merged = merged.padEnd(maxPos, ' ');
  }

  for (let j = chordPositions.length - 1; j >= 0; j--) {
    const { chord, position } = chordPositions[j];
    merged = merged.slice(0, position) + `[${chord}]` + merged.slice(position);
  }

  return merged;
}

function extractAllChords(lyrics) {
  if (!lyrics) return [];
  const normalizedLyrics = convertToChordPro(lyrics);
  const chordMatches = normalizedLyrics.match(/\[([^\]]+)\]/g) || [];

  return chordMatches
    .map(chord => chord.slice(1, -1).trim())
    .filter(chord => {
      if (!chord) return false;
      const lowerChord = chord.toLowerCase();
      if (SECTION_LABELS.some(label => lowerChord.includes(label))) return false;
      return /^[A-G]/.test(chord);
    });
}

function getChordRoot(chord) {
  const noteMatch = chord.match(/^([A-G][#b]?)/);
  return noteMatch ? noteMatch[1] : null;
}

function detectKey(lyrics) {
  const chords = extractAllChords(lyrics);

  if (chords.length === 0) return 'C';

  const chordFrequency = chords.reduce((acc, chord) => {
    acc[chord] = (acc[chord] || 0) + 1;
    return acc;
  }, {});

  const ALL_MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C#', 'F#'];

  let bestKey = getChordRoot(chords[0]) || 'C';
  let bestScore = -1;

  const EXPECTED_QUALITIES = [
    'Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'
  ];

  const parsedChords = Object.entries(chordFrequency).map(([chordName, freq]) => {
    const chordInfo = Chord.get(chordName);
    const tonic = chordInfo.empty ? getChordRoot(chordName) : chordInfo.tonic;
    const quality = chordInfo.empty ? 'Major' : chordInfo.quality;
    const chroma = tonic ? Note.chroma(tonic) : null;
    return { chordName, freq, chroma, quality };
  });

  const firstChordInfo = Chord.get(chords[0]);
  const firstChordIsMinor = firstChordInfo.quality === 'Minor';
  const firstChordRoot = getChordRoot(chords[0]);

  for (const potentialKey of ALL_MAJOR_KEYS) {
    try {
      const majorScale = Scale.get(`${potentialKey} major`);
      const scaleNotes = majorScale.notes;
      if (!scaleNotes || scaleNotes.length === 0) continue;

      const degreeChromas = scaleNotes.map(n => Note.chroma(n));
      let score = 0;

      for (const { freq, chroma, quality } of parsedChords) {
        if (chroma === null || chroma === undefined) continue;
        const degreeIndex = degreeChromas.indexOf(chroma);

        if (degreeIndex !== -1) {
          const expectedQuality = EXPECTED_QUALITIES[degreeIndex];
          if (quality === expectedQuality) {
            score += freq * 3;
            if (degreeIndex === 0 || degreeIndex === 3 || degreeIndex === 4) {
              score += freq * 2;
            }
          } else {
            score += freq * 1;
          }
        }
      }

      if (firstChordRoot) {
        const rootChroma = Note.chroma(firstChordRoot);
        const keyChroma = Note.chroma(potentialKey);
        if (rootChroma !== undefined && rootChroma === keyChroma) {
          score += 10;
        }
      }

      const lastChordRoot = getChordRoot(chords[chords.length - 1]);
      if (lastChordRoot) {
        const rootChroma = Note.chroma(lastChordRoot);
        const keyChroma = Note.chroma(potentialKey);
        if (rootChroma !== undefined && rootChroma === keyChroma) {
          score += 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestKey = potentialKey;
      }
    } catch (error) {
      continue;
    }
  }

  // If the first chord is minor, return a minor key
  if (firstChordIsMinor && firstChordRoot) {
    const firstChordChroma = Note.chroma(firstChordRoot);
    const bestKeyChroma = Note.chroma(bestKey);

    if (firstChordChroma !== undefined && bestKeyChroma !== undefined) {
      return firstChordRoot + 'm';
    }
  }

  return bestKey;
}

// ─── Main migration ───

async function main() {
  console.log('🎵 Updating song keys (major/minor detection)...\n');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  const songs = await collection.find({}).toArray();
  console.log(`Found ${songs.length} songs. Re-detecting keys...\n`);

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const song of songs) {
    if (!song.lyrics) {
      skipped++;
      continue;
    }

    const newKey = detectKey(song.lyrics);
    const oldKey = song.originalKey || '(none)';

    if (newKey !== song.originalKey) {
      await collection.updateOne(
        { _id: song._id },
        { $set: { originalKey: newKey, updatedAt: new Date() } }
      );
      updated++;
      console.log(`  ✏️  "${song.title}" — ${oldKey} → ${newKey}`);
    } else {
      unchanged++;
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Done!`);
  console.log(`   Updated:   ${updated} songs`);
  console.log(`   Unchanged: ${unchanged} songs`);
  console.log(`   Skipped:   ${skipped} songs (no lyrics)`);
  console.log(`========================================`);

  await client.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
