import { Scale, Chord, Note } from '@tonaljs/tonal';
import { convertToChordPro } from './chordParser';

// Section labels to ignore when extracting chords
const SECTION_LABELS = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'instrumental', 'tag', 'interlude', 'pre-chorus', 'ending', 'end', 'solo'];

/**
 * Extract all chords from lyrics (ignoring section labels)
 */
function extractAllChords(lyrics: string): string[] {
  if (!lyrics) return [];
  // First normalize to chordpro format so we can extract bracketed chords
  const normalizedLyrics = convertToChordPro(lyrics);
  const chordMatches = normalizedLyrics.match(/\[([^\]]+)\]/g) || [];
  
  const chords = chordMatches
    .map(chord => chord.slice(1, -1).trim())
    .filter(chord => {
      if (!chord) return false;
      const lowerChord = chord.toLowerCase();
      // Ignore section labels
      if (SECTION_LABELS.some(label => lowerChord.includes(label))) return false;
      // Basic check: must start with A-G
      return /^[A-G]/.test(chord);
    });
    
  return chords; // Do not use Set so we can count frequencies
}

/**
 * Get the root note from a chord string using simple regex
 */
function getChordRoot(chord: string): string | null {
  const noteMatch = chord.match(/^([A-G][#b]?)/);
  return noteMatch ? noteMatch[1] : null;
}

/**
 * Analyze chords to determine the most likely key.
 * If the root (first) chord is minor, returns a minor key name (e.g. "Am").
 */
export function detectKey(lyrics: string): string {
  const chords = extractAllChords(lyrics);

  if (chords.length === 0) {
    return ''; // No chords found, so no key can be detected
  }

  // Count frequency of each chord
  const chordFrequency = chords.reduce((acc, chord) => {
    acc[chord] = (acc[chord] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ALL_MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'C#', 'F#'];

  let bestKey = getChordRoot(chords[0]) || 'C';
  let bestScore = -1;

  // Expected diatonic qualities for major scale degrees 1 through 7
  // I, ii, iii, IV, V, vi, vii°
  const EXPECTED_QUALITIES = [
    'Major',       // I
    'Minor',       // ii
    'Minor',       // iii
    'Major',       // IV
    'Major',       // V
    'Minor',       // vi
    'Diminished'   // vii°
  ];

  // Pre-parse the song's chords
  const parsedChords = Object.entries(chordFrequency).map(([chordName, freq]) => {
    const chordInfo = Chord.get(chordName);
    const tonic = chordInfo.empty ? getChordRoot(chordName) : chordInfo.tonic;
    const quality = chordInfo.empty ? 'Major' : chordInfo.quality; // fallback to Major if unknown
    const chroma = tonic ? Note.chroma(tonic) : null;
    return { chordName, freq, chroma, quality };
  });

  // Detect if the first chord is minor
  const firstChordInfo = Chord.get(chords[0]);
  const firstChordIsMinor = firstChordInfo.quality === 'Minor';
  const firstChordRoot = getChordRoot(chords[0]);

  for (const potentialKey of ALL_MAJOR_KEYS) {
    try {
      const majorScale = Scale.get(`${potentialKey} major`);
      const scaleNotes = majorScale.notes;
      if (!scaleNotes || scaleNotes.length === 0) continue;

      // Extract the chroma for each of the 7 degrees of the scale
      const degreeChromas = scaleNotes.map(n => Note.chroma(n));

      let score = 0;
      
      for (const { freq, chroma, quality } of parsedChords) {
        if (chroma === null || chroma === undefined) continue;

        // Check if the chord's root note belongs to this major scale
        const degreeIndex = degreeChromas.indexOf(chroma);
        
        if (degreeIndex !== -1) {
          // The root note is in the scale!
          const expectedQuality = EXPECTED_QUALITIES[degreeIndex];
          
          if (quality === expectedQuality) {
            // Perfect match for both root and quality (e.g. 'Am' as the ii chord in G major)
            score += freq * 3;
            
            // Extra bonus for the I, IV, and V chords as they strongly define the key
            if (degreeIndex === 0 || degreeIndex === 3 || degreeIndex === 4) {
              score += freq * 2;
            }
          } else {
            // Root is in the key, but quality is different (e.g. a borrowed chord)
            score += freq * 1;
          }
        }
      }

      // Bonus if the first chord root matches the tonic
      if (firstChordRoot) {
        const rootChroma = Note.chroma(firstChordRoot);
        const keyChroma = Note.chroma(potentialKey);
        if (rootChroma !== undefined && rootChroma === keyChroma) {
          score += 10; // Strong indicator
        }
      }

      // Bonus if the last chord root matches the tonic
      const lastChordRoot = getChordRoot(chords[chords.length - 1]);
      if (lastChordRoot) {
        const rootChroma = Note.chroma(lastChordRoot);
        const keyChroma = Note.chroma(potentialKey);
        if (rootChroma !== undefined && rootChroma === keyChroma) {
          score += 10; // Strong indicator
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

  // If the first chord is minor, return the relative minor key.
  // The relative minor of a major key is the vi degree (index 5),
  // which is 9 semitones above (or 3 below) the major root.
  if (firstChordIsMinor && firstChordRoot) {
    const firstChordChroma = Note.chroma(firstChordRoot);
    const bestKeyChroma = Note.chroma(bestKey);

    if (firstChordChroma !== undefined && bestKeyChroma !== undefined) {
      // Check if the first chord root is the vi degree of the detected major key
      // (vi = relative minor), i.e. firstChordChroma === (bestKeyChroma + 9) % 12
      const relativeMinorChroma = (bestKeyChroma + 9) % 12;
      if (firstChordChroma === relativeMinorChroma) {
        // The detected major key's relative minor matches the first chord — return minor key
        return firstChordRoot + 'm';
      }

      // Even if the first chord minor root doesn't match the vi of detected key,
      // but the song starts on a minor chord, treat it as that minor key
      return firstChordRoot + 'm';
    }
  }

  return bestKey;
}
