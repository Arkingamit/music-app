
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Playlist, Song } from '@/lib/types';
import { useAuth, authFetch } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PlaylistContextType {
  playlists: Playlist[];
  favoriteIds: string[]; // Set of song IDs that are liked
  loading: boolean;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  updatePlaylist: (id: string, name: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  isFavorite: (songId: string) => boolean;
  refreshPlaylists: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const PlaylistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshPlaylists = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists);
      }
    } catch (error) {
      console.error('Error refreshing playlists:', error);
    }
  }, [currentUser]);

  const refreshFavorites = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await authFetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(data.favorites || []);
      }
    } catch (error) {
      console.error('Error refreshing favorites:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      Promise.all([refreshPlaylists(), refreshFavorites()])
        .finally(() => setLoading(false));
    } else {
      setPlaylists([]);
      setFavoriteIds([]);
    }
  }, [currentUser, refreshPlaylists, refreshFavorites]);

  const createPlaylist = async (name: string) => {
    try {
      const res = await authFetch('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => [data.playlist, ...prev]);
        toast({ title: 'Success', description: `Playlist "${name}" created` });
        return data.playlist;
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to create playlist', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create playlist', variant: 'destructive' });
    }
    return null;
  };

  const updatePlaylist = async (id: string, name: string) => {
    try {
      const res = await authFetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => prev.map(p => p.id === id ? data.playlist : p));
        toast({ title: 'Success', description: 'Playlist updated' });
        return data.playlist;
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update playlist', variant: 'destructive' });
    }
    return null;
  };

  const deletePlaylist = async (id: string) => {
    try {
      const res = await authFetch(`/api/playlists/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        toast({ title: 'Success', description: 'Playlist deleted' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete playlist', variant: 'destructive' });
    }
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await authFetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        await refreshPlaylists();
        toast({ title: 'Success', description: 'Song added to playlist' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to add song', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add song to playlist', variant: 'destructive' });
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const res = await authFetch(`/api/playlists/${playlistId}/songs?songId=${songId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshPlaylists();
        toast({ title: 'Success', description: 'Song removed from playlist' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove song', variant: 'destructive' });
    }
  };

  const toggleFavorite = async (songId: string) => {
    try {
      const res = await authFetch('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ songId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.liked) {
          setFavoriteIds(prev => [...prev, songId]);
        } else {
          setFavoriteIds(prev => prev.filter(id => id !== songId));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (songId: string) => favoriteIds.includes(songId);

  return (
    <PlaylistContext.Provider value={{
      playlists,
      favoriteIds,
      loading,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      toggleFavorite,
      isFavorite,
      refreshPlaylists,
      refreshFavorites,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylists = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
};
