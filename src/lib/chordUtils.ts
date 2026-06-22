import { Scale, Note } from '@tonaljs/tonal';

// ─── Chromatic scale lookup tables (same as chordParser.ts) ───
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11, 'B#': 0,
};

const ROOT_NOTE_REGEX = /^([A-G][#b]?)/;

/**
 * Transpose a single note name by N semitones using lookup table.
 */
export const transposeNote = (
  note: string,
  semitones: number,
  useFlats: boolean = false
): string => {
  if (!note || semitones === 0) return note;
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) return note;
  const scale = useFlats ? FLATS : SHARPS;
  const newIndex = ((index + semitones) % 12 + 12) % 12;
  return scale[newIndex];
};

/**
 * Transpose a single chord part (no slash).
 */
function transposeChordPart(chordPart: string, semitones: number, useFlats: boolean): string {
  const match = chordPart.match(ROOT_NOTE_REGEX);
  if (!match) return chordPart;

  const rootNote = match[1];
  const suffix = chordPart.substring(rootNote.length);
  const transposedRoot = transposeNote(rootNote, semitones, useFlats);

  return transposedRoot + suffix;
}

/**
 * Transpose a single chord by a given number of semitones.
 * Handles slash chords (D/F#), sus/add/dim/aug/maj chords, and any suffix.
 */
export const transposeChord = (
  chord: string,
  semitones: number,
  useFlats: boolean = false
): string => {
  if (!chord || semitones === 0) return chord;

  // Handle slash chords: split on '/', transpose each part separately
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return parts.map(part => transposeChordPart(part.trim(), semitones, useFlats)).join('/');
  }

  return transposeChordPart(chord, semitones, useFlats);
};

/**
 * Transpose all chords in lyrics text
 */
export const transposeLyrics = (
  lyrics: string,
  semitones: number,
  useFlats: boolean = false
): string => {
  if (semitones === 0 || !lyrics) return lyrics;

  return lyrics.replace(/\[([^\]]+)\]/g, (match, chord) => {
    const transposedChord = transposeChord(chord, semitones, useFlats);
    return `[${transposedChord}]`;
  });
};

/**
 * Extract chords from lyrics for displaying chord diagrams
 */
export const extractChordsFromLyrics = (lyricsWithChords: string): string[] => {
  if (!lyricsWithChords) return [];

  const chordMatches = lyricsWithChords.match(/\[([^\]]+)\]/g) || [];
  const chords = chordMatches.map(chord => chord.slice(1, -1));

  return [...new Set(chords)];
};

/**
 * Get relative key name for a transposition
 */
export function getTransposedKeyName(originalKey: string, semitones: number): string {
  if (!originalKey || semitones === 0) return originalKey;

  const match = originalKey.match(/^([A-G][#b]?)(.*)/);
  if (!match) return originalKey;

  const [, rootNote, mode] = match;
  const transposedRoot = transposeNote(rootNote, semitones, false);

  return transposedRoot + mode;
}

/**
 * Enharmonic equivalents map: sharp ↔ flat for notes that have one.
 * Natural notes (C, D, E, F, G, A, B) have no enharmonic equivalent displayed.
 */
const ENHARMONIC_MAP: Record<string, string> = {
  'C#': 'Db', 'Db': 'C#',
  'D#': 'Eb', 'Eb': 'D#',
  'F#': 'Gb', 'Gb': 'F#',
  'G#': 'Ab', 'Ab': 'G#',
  'A#': 'Bb', 'Bb': 'A#',
};

/**
 * Returns a display string for a key that shows enharmonic equivalents.
 * e.g. "C#" → "C# / Db", "Am" → "Am", "Bbm" → "Bbm / A#m", "G" → "G"
 */
export function getKeyDisplayName(key: string): string {
  if (!key) return key;

  const match = key.match(/^([A-G][#b]?)(.*)/);
  if (!match) return key;

  const [, rootNote, mode] = match;
  const enharmonic = ENHARMONIC_MAP[rootNote];

  if (enharmonic) {
    return `${rootNote}${mode} / ${enharmonic}${mode}`;
  }

  return key;
}

/**
 * Generate common chord progressions for a given key
 */
export function getCommonProgressions(key: string): Record<string, string[]> {
  try {
    const majorScale = getMajorScaleChords(key);

    return {
      'I-IV-V': [majorScale[0], majorScale[3], majorScale[4]],
      'I-V-vi-IV': [majorScale[0], majorScale[4], majorScale[5], majorScale[3]],
      'ii-V-I': [majorScale[1], majorScale[4], majorScale[0]],
      'I-vi-IV-V': [majorScale[0], majorScale[5], majorScale[3], majorScale[4]]
    };
  } catch (error) {
    console.warn(`Failed to generate progressions for key: ${key}`, error);
    return {};
  }
}

/**
 * Get all diatonic chords in a major key using Tonal (Scale only)
 */
function getMajorScaleChords(key: string): string[] {
  try {
    const scaleNotes = Scale.get(`${key} major`).notes;

    const qualities = ['', 'm', 'm', '', '', 'm', 'dim'];

    return scaleNotes.map((note, idx) => {
      return note + qualities[idx];
    });
  } catch (error) {
    console.warn(`Failed to get major scale chords for key: ${key}`, error);
    return [];
  }
}

/**
 * Converts a chord string to the Nashville Number System relative to a key.
 * 
 * For major keys (e.g. C, D, G): uses standard major scale degrees.
 * For minor keys (e.g. Am, Em): uses natural minor scale degrees directly,
 * which is the practical convention for worship/church music charts.
 * 
 * Example in Am: Am=1m, C=3, Dm=4m, E=5, F=6, G=7
 */
export function convertToNumberSystem(chord: string, keyName: string): string {
  if (!chord || !keyName) return chord;
  
  // Detect if the key is minor (e.g. "Am", "C#m", "Ebm")
  const keyMatch = keyName.match(/^([A-G][#b]?)(m.*)?$/i);
  if (!keyMatch) return chord;
  const keyRoot = keyMatch[1];
  const isMinorKey = !!(keyMatch[2] && keyMatch[2].startsWith('m'));
  const keyChroma = Note.chroma(keyRoot);
  
  if (keyChroma === null || keyChroma === undefined) return chord;

  // Major scale NNS mapping: semitone offset → number label
  // C major: C=1, Db=b2, D=2, Eb=b3, E=3, F=4, F#=b5, G=5, Ab=b6, A=6, Bb=b7, B=7
  const majorNnsMap = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

  // Natural minor scale NNS mapping (practical worship convention):
  // Count directly from the minor root. A minor: A=1, _=b2, B=2, C=3, _=#3, D=4, _=b5, E=5, F=6, _=#6, G=7, _=#7
  // Semitone offsets from root: 0=1, 1=b2, 2=2, 3=3, 4=#3, 5=4, 6=b5, 7=5, 8=6, 9=#6, 10=7, 11=#7
  const minorNnsMap = ['1', 'b2', '2', '3', '#3', '4', 'b5', '5', '6', '#6', '7', '#7'];

  const nnsMap = isMinorKey ? minorNnsMap : majorNnsMap;

  // Handle slash chords: split, convert each, and rejoin
  if (chord.includes('/')) {
    return chord.split('/').map(part => convertToNumberSystem(part.trim(), keyName)).join('/');
  }

  // Extract the root note and any suffix (m, dim, aug, 7, sus, etc.)
  const match = chord.match(/^([A-G][#b]?)(.*)/i);
  if (!match) return chord;

  const rootNote = match[1];
  const suffix = match[2];
  
  const chordChroma = Note.chroma(rootNote);
  if (chordChroma === null || chordChroma === undefined) return chord;

  // Calculate relative degree (0-11)
  const diff = (chordChroma - keyChroma + 12) % 12;
  const numberRoot = nnsMap[diff];
  
  return numberRoot + suffix;
}
