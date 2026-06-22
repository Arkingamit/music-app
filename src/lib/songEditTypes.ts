import { SongSection } from './chordParser';

// ─── Annotation ───

export interface Annotation {
  id: string;
  text: string;
  color?: string;  // optional text color for the annotation
}

// ─── Per-song edit state ───

export interface SongEditState {
  /** chord overrides: key = "sIdx-lIdx-cIdx" */
  chordOverrides: Record<string, string>;
  /** lyric overrides: key = "sIdx-lIdx" */
  lyricOverrides: Record<string, string>;
  /** section label overrides: key = sIdx */
  labelOverrides: Record<number, string>;
  /** section order (indices into the original sections array) */
  sectionOrder: number[];
  /** hidden sections */
  hiddenSections: number[];  // stored as array for JSON serialization
  /** annotations per section */
  annotations: Record<number, Annotation[]>;
  /** per-line color overrides: key = "sIdx-lIdx" */
  lyricColorOverrides: Record<string, string>;
  /** per-chord color overrides: key = "sIdx-lIdx-cIdx" */
  chordColorOverrides: Record<string, string>;
  /** style overrides */
  styles: {
    chordColor: string;
    lyricColor: string;
  };
}

// ─── Color Presets ───

export const ANNOTATION_COLOR_PRESETS = [
  { label: 'Purple', value: '#a855f7' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'White', value: '#ffffff' },
];

export const CHORD_COLOR_PRESETS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Red (Default)', value: '#dc2626' },
];

export const LYRIC_COLOR_PRESETS = [
  { label: 'Default', value: '' },
  { label: 'Slate', value: '#334155' },
  { label: 'Zinc', value: '#3f3f46' },
  { label: 'Stone', value: '#44403c' },
  { label: 'Warm', value: '#78350f' },
  { label: 'Cool', value: '#1e3a5f' },
];

// ─── Helpers ───

let annotationIdCounter = 0;
export function nextAnnotationId(): string {
  return `ann-${Date.now()}-${++annotationIdCounter}`;
}

export function createEmptyEditState(sections: SongSection[]): SongEditState {
  return {
    chordOverrides: {},
    lyricOverrides: {},
    labelOverrides: {},
    sectionOrder: sections.map((_, i) => i),
    hiddenSections: [],
    annotations: {},
    lyricColorOverrides: {},
    chordColorOverrides: {},
    styles: { chordColor: '', lyricColor: '' },
  };
}

/**
 * Deep clone an edit state for undo/redo history.
 */
export function cloneEditState(state: SongEditState): SongEditState {
  return {
    chordOverrides: { ...state.chordOverrides },
    lyricOverrides: { ...state.lyricOverrides },
    labelOverrides: { ...state.labelOverrides },
    sectionOrder: [...state.sectionOrder],
    hiddenSections: [...state.hiddenSections],
    annotations: Object.fromEntries(
      Object.entries(state.annotations).map(([k, v]) => [k, v.map(a => ({ ...a }))])
    ),
    lyricColorOverrides: { ...(state.lyricColorOverrides || {}) },
    chordColorOverrides: { ...(state.chordColorOverrides || {}) },
    styles: { ...state.styles },
  };
}

/**
 * Deep clone all edit states (for full undo/redo snapshots).
 */
export function cloneEditStates(states: Record<string, SongEditState>): Record<string, SongEditState> {
  const result: Record<string, SongEditState> = {};
  for (const [key, state] of Object.entries(states)) {
    result[key] = cloneEditState(state);
  }
  return result;
}
