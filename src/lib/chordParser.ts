// lib/chordParser.ts

// ─── Types ───
export interface ChordPosition {
  chord: string;
  position: number;
}

export interface ParsedLine {
  lyrics: string;
  chords: ChordPosition[];
}

// ─── Chromatic scale lookup tables (no external dependency) ───
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map every common note name to its semitone index (0-11)
const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11, 'B#': 0,
};

// Regex to extract the root note from a chord string (e.g., "C#m7" → "C#", "Dsus4" → "D")
const ROOT_NOTE_REGEX = /^([A-G][#b]?)/;

/**
 * Transpose a single note name by N semitones.
 */
function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) return note;
  const scale = useFlats ? FLATS : SHARPS;
  const newIndex = ((index + semitones) % 12 + 12) % 12;
  return scale[newIndex];
}

/**
 * Transpose a single chord part (no slash).
 * Extracts root note, transposes it, re-attaches the suffix.
 */
function transposeChordPart(chordPart: string, semitones: number, useFlats: boolean): string {
  const match = chordPart.match(ROOT_NOTE_REGEX);
  if (!match) return chordPart; // not a recognizable chord, return as-is

  const rootNote = match[1];
  const suffix = chordPart.substring(rootNote.length); // everything after the root (m, 7, sus4, add9, dim, etc.)
  const transposedRoot = transposeNote(rootNote, semitones, useFlats);

  return transposedRoot + suffix;
}

/**
 * Transpose a single chord string by N semitones.
 * Handles slash chords (D/F#), sus/add/dim/aug/maj chords, and any suffix.
 */
export function transposeChord(chord: string, semitones: number, useFlats: boolean = false): string {
  if (!chord || semitones === 0) return chord;

  // Handle slash chords: split on '/', transpose each part separately
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return parts.map(part => transposeChordPart(part.trim(), semitones, useFlats)).join('/');
  }

  return transposeChordPart(chord, semitones, useFlats);
}

// ─── ChordPro Conversion ───

// Regex pattern for chords including sharps, flats, minors, maj, sus, add, slashes
const CHORD_REGEX = /(?:^|\s|\[)[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|aad|[M\+\-\d])*(?:\/[A-G][#b]?)?(?=\s|\]|$)/;

// Regex to detect section headers like [Chorus], [Verse 2], etc.
const SECTION_HEADER_REGEX = /^\[(Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Instrumental|Solo|Tag|End|Interlude|Ending).*\]$/i;

/**
 * Convert a "chords over lyrics" song text into ChordPro format ([C]lyrics).
 * Uses a proper chord regex to detect chord lines and merges them inline
 * with the lyric line below. Section headers like [Verse 1] are preserved
 * with brackets stripped.
 */
export function convertToChordPro(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].replace(/\r$/, '');

    // Empty lines pass through
    if (line.trim().length === 0) {
      result.push('');
      i++;
      continue;
    }

    // Detect section headers like [Chorus], [Verse 2] and strip the outer brackets
    if (SECTION_HEADER_REGEX.test(line.trim())) {
      const cleanHeader = line.trim().replace(/^\[|\]$/g, '');
      result.push(cleanHeader);
      i++;
      continue;
    }

    // If this line contains chords and a next line exists, merge them inline
    if (i + 1 < lines.length && line.trim().length > 0) {
      const nextLine = lines[i + 1];
      // Check all tokens on this line look like chords (avoid treating lyric lines as chord lines)
      const tokens = line.trim().split(/\s+/);
      const allTokensAreChords = tokens.length > 0 && tokens.every(token => {
        const clean = token.replace(/^\[|\]$/g, '');
        return /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|aad|[M\+\-\d])*(?:\/[A-G][#b]?)?$/.test(clean);
      });

      if (allTokensAreChords) {
        result.push(mergeChordsInline(line, nextLine));
        i += 2;
        continue;
      }
    }

    // Default: pass through as-is
    result.push(line);
    i++;
  }

  return result.join('\n');
}

/**
 * Merge a chord line into a lyric line by inserting [Chord] at the correct
 * character positions. Inserts backwards to preserve earlier positions.
 */
function mergeChordsInline(chordLine: string, lyricLine: string): string {
  // Find each chord token and its character position in the chord line
  const chordPositions: { chord: string; position: number }[] = [];
  const tokens = chordLine.split(/(\s+)/); // split keeping whitespace
  let cursor = 0;

  for (const token of tokens) {
    if (token.trim().length > 0) {
      chordPositions.push({ chord: token, position: cursor });
    }
    cursor += token.length;
  }

  // Find the maximum position needed
  const maxPos = chordPositions.length > 0 ? chordPositions[chordPositions.length - 1].position : 0;

  let merged = lyricLine;
  // Right-pad the lyric line if it's too short, so trailing chords don't condense
  if (merged.length < maxPos) {
    merged = merged.padEnd(maxPos, ' ');
  }

  // Insert chords backwards to avoid shifting positions
  for (let j = chordPositions.length - 1; j >= 0; j--) {
    const { chord, position } = chordPositions[j];
    // We already padded the string, so we can insert directly at position
    merged = merged.slice(0, position) + `[${chord}]` + merged.slice(position);
  }

  return merged;
}

// ─── Line Parsing ───

function stripHtml(html: string) {
  if (typeof document !== 'undefined') {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
  return html.replace(/<[^>]*>?/gm, '');
}

export function parseLineWithChords(line: string): ParsedLine {
  const chords: ChordPosition[] = [];
  let lyrics = '';
  let currentPos = 0;
  let lyricsPos = 0;

  const chordRegex = /\[([^\]]+)\]/g;
  let match;

  while ((match = chordRegex.exec(line)) !== null) {
    const chordStart = match.index;
    const chord = match[1];

    const textBefore = line.substring(currentPos, chordStart);
    lyrics += textBefore;
    lyricsPos += stripHtml(textBefore).length;

    chords.push({ chord, position: lyricsPos });
    currentPos = chordStart + match[0].length;
  }

  lyrics += line.substring(currentPos);
  return { lyrics, chords };
}

// ─── Transposition of Parsed Lines ───

export function transposeParsedLine(parsedLine: ParsedLine, semitones: number, useFlats: boolean = false): ParsedLine {
  return {
    lyrics: parsedLine.lyrics,
    chords: parsedLine.chords.map(chordPos => ({
      ...chordPos,
      chord: transposeChord(chordPos.chord, semitones, useFlats),
    }))
  };
}

export function parseSongWithChordsInChunks(song: string, chunkSize: number = 40): ParsedLine[] {
  const tokenRegex = /(\[([^\]]+)\])|([^\s]+)/g;
  const chunks: ParsedLine[] = [];

  let currentLyrics = '';
  let currentChords: ChordPosition[] = [];
  let currentChunkWordCount = 0;
  let currentLyricsPos = 0;

  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(song)) !== null) {
    const [fullMatch, bracketed, chordName, lyricWord] = match;

    if (bracketed && chordName) {
      currentChords.push({ chord: chordName, position: currentLyricsPos });
    } else if (lyricWord) {
      currentLyrics += lyricWord + ' ';
      currentLyricsPos += lyricWord.length + 1;
      currentChunkWordCount++;
    }

    if (currentChunkWordCount >= chunkSize) {
      chunks.push({
        lyrics: currentLyrics.trim(),
        chords: [...currentChords]
      });
      currentLyrics = '';
      currentChords = [];
      currentChunkWordCount = 0;
      currentLyricsPos = 0;
    }
  }

  if (currentLyrics.trim().length > 0) {
    chunks.push({
      lyrics: currentLyrics.trim(),
      chords: [...currentChords]
    });
  }

  return chunks;
}

// ─── Section Parsing ───

export interface SongSection {
  label: string;
  lines: string[];     // raw ChordPro lines
  hasChords: boolean;   // whether this section contains any chords
}

/** Detect a section label from the first line content */
export function detectSectionLabel(lines: string[], index: number): string {
  const firstLine = lines[0]?.trim().toLowerCase() || '';

  // Check for explicit section markers
  const sectionPatterns: [RegExp, string][] = [
    [/^\[?(verse|v)\s*(\d+)?\]?:?\s*$/i, 'Verse'],
    [/^\[?(chorus|ch)\]?:?\s*$/i, 'Chorus'],
    [/^\[?(bridge|br)\]?:?\s*$/i, 'Bridge'],
    [/^\[?(pre-?chorus|pc)\]?:?\s*$/i, 'Pre-Chorus'],
    [/^\[?(outro)\]?:?\s*$/i, 'Outro'],
    [/^\[?(intro)\]?:?\s*$/i, 'Intro'],
    [/^\[?(tag)\]?:?\s*$/i, 'Tag'],
    [/^\[?(interlude)\]?:?\s*$/i, 'Interlude'],
    [/^\[?(ending)\]?:?\s*$/i, 'Ending'],
    [/^\[?(end)\]?:?\s*$/i, 'End'],
  ];

  for (const [pattern, label] of sectionPatterns) {
    const match = firstLine.match(pattern);
    if (match) {
      const num = match[2] ? ` ${match[2]}` : '';
      return `${label}${num}`;
    }
  }

  return `Section ${index + 1}`;
}

/** Split lyrics into sections separated by blank lines */
export function splitIntoSections(lyrics: string, format: 'auto' | 'chordpro' = 'auto'): SongSection[] {
  const chordProLyrics = format === 'chordpro' ? lyrics : convertToChordPro(lyrics);
  const allLines = chordProLyrics.split('\n');
  const sections: SongSection[] = [];
  let currentLines: string[] = [];

  for (const line of allLines) {
    if (line.trim() === '') {
      if (currentLines.length > 0) {
        sections.push(buildSection(currentLines, sections.length));
        currentLines = [];
      }
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push(buildSection(currentLines, sections.length));
  }

  return sections;
}

function buildSection(lines: string[], index: number): SongSection {
  const chordRegex = /\[([^\]]+)\]/;
  const label = detectSectionLabel(lines, index);

  // If the first line was used as a section label, remove it from content lines
  // so it doesn't render twice (once as label, once as lyric)
  let contentLines = lines;
  if (label !== `Section ${index + 1}` && lines.length > 0) {
    contentLines = lines.slice(1);
  }

  const hasChords = contentLines.some(l => chordRegex.test(l));
  return { label, lines: contentLines, hasChords };
}
