// songTypes.ts or directly inside your context file
import { Song, SongInput } from '@/lib/types';

export interface SongContextType {
  songs: Song[];
  loading: boolean;
  addSong: (song: SongInput) => Promise<void>;
  getSong: (id: string) => Song | undefined;
  updateSong: (id: string, song: Partial<Song>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  getAllSongs: () => Song[]; // ✅ new method
}
