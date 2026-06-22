
/**
 * Parse Ultimate Guitar style song format
 * where chords are on lines above lyrics
 */
export interface ParsedSongLine {
  type: 'chord' | 'lyric' | 'both' | 'empty';
  content: string;
  chords?: Array<{
    chord: string;
    position: number;
  }>;
}

export interface ParsedSong {
  lines: ParsedSongLine[];
  chords: string[];
}

/**
 * Parse Ultimate Guitar format and convert to structured format
 */
export const parseUltimateGuitarFormat = (input: string): ParsedSong => {
  const lines = input.split('\n');
  const parsedLines: ParsedSongLine[] = [];
  const allChords = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    // Empty line
    if (!line.trim()) {
      parsedLines.push({
        type: 'empty',
        content: ''
      });
      continue;
    }
    
    // Check if this line contains chords (heuristic: mostly chord symbols and spaces)
    const isChordLine = isLikelyChordLine(line);
    
    if (isChordLine && nextLine && nextLine.trim()) {
      // This is a chord line with lyrics below
      const chords = extractChordsWithPositions(line);
      chords.forEach(chord => allChords.add(chord.chord));
      
      parsedLines.push({
        type: 'both',
        content: nextLine,
        chords: chords
      });
      
      i++; // Skip the next line as we've processed it
    } else if (isChordLine) {
      // Chord line without lyrics
      const chords = extractChordsWithPositions(line);
      chords.forEach(chord => allChords.add(chord.chord));
      
      parsedLines.push({
        type: 'chord',
        content: '',
        chords: chords
      });
    } else {
      // Regular lyric line
      parsedLines.push({
        type: 'lyric',
        content: line
      });
    }
  }
  
  return {
    lines: parsedLines,
    chords: Array.from(allChords)
  };
};

/**
 * Heuristic to determine if a line is likely a chord line
 */
const isLikelyChordLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Common chord patterns
  const chordPattern = /\b[A-G][#b]?(?:maj|min|m|sus|add|dim|aug|\d+)*(?:\/[A-G][#b]?)?\b/g;
  const chordMatches = trimmed.match(chordPattern) || [];
  
  // Calculate ratio of chord characters to total characters
  const chordLength = chordMatches.join('').length;
  const totalNonSpaceLength = trimmed.replace(/\s/g, '').length;
  
  // If more than 60% of non-space characters are chord-like, consider it a chord line
  return chordLength / totalNonSpaceLength > 0.6;
};

/**
 * Extract chords and their positions from a chord line
 */
const extractChordsWithPositions = (line: string): Array<{ chord: string; position: number }> => {
  const chords: Array<{ chord: string; position: number }> = [];
  const chordPattern = /\b[A-G][#b]?(?:maj|min|m|sus|add|dim|aug|\d+)*(?:\/[A-G][#b]?)?\b/g;
  
  let match;
  while ((match = chordPattern.exec(line)) !== null) {
    chords.push({
      chord: match[0],
      position: match.index
    });
  }
  
  return chords;
};

/**
 * Convert parsed structure back to display format with inline chords
 */
export const convertToInlineFormat = (parsedSong: ParsedSong): string => {
  return parsedSong.lines.map(line => {
    if (line.type === 'both' && line.chords) {
      // Insert chords at their positions in the lyrics
      let result = line.content;
      let offset = 0;
      
      // Sort chords by position (reverse order to maintain positions)
      const sortedChords = [...line.chords].sort((a, b) => b.position - a.position);
      
      sortedChords.forEach(({ chord, position }) => {
        const insertPos = Math.min(position + offset, result.length);
        result = result.slice(0, insertPos) + `[${chord}]` + result.slice(insertPos);
      });
      
      return result;
    } else if (line.type === 'chord' && line.chords) {
      // Chord-only line
      return line.chords.map(c => `[${c.chord}]`).join(' ');
    } else {
      return line.content;
    }
  }).join('\n');
};

/**
 * Convert parsed structure to display format with separate chord and lyric lines
 */
export const convertToDisplayFormat = (parsedSong: ParsedSong): string => {
  return parsedSong.lines.map(line => {
    if (line.type === 'both' && line.chords) {
      // Create chord line above lyrics
      let chordLine = ' '.repeat(100);
      line.chords.forEach(({ chord, position }) => {
        const adjustedPos = Math.min(position, chordLine.length - chord.length);
        chordLine = chordLine.substring(0, adjustedPos) + chord + chordLine.substring(adjustedPos + chord.length);
      });
      
      return chordLine.trimRight() + '\n' + line.content;
    } else if (line.type === 'chord' && line.chords) {
      // Chord-only line
      let chordLine = ' '.repeat(100);
      line.chords.forEach(({ chord, position }) => {
        const adjustedPos = Math.min(position, chordLine.length - chord.length);
        chordLine = chordLine.substring(0, adjustedPos) + chord + chordLine.substring(adjustedPos + chord.length);
      });
      return chordLine.trimRight();
    } else {
      return line.content;
    }
  }).join('\n');
};
