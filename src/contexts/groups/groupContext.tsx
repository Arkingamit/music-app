
import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Group, Message, MusicianAssignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth, authFetch } from '@/contexts/AuthContext';
import { GroupContextType } from './types';
import { getFullUrl } from '@/lib/api';

import { 
  createGroupActions, 
  createSongActions, 
  createMemberActions, 
  createMessageActions, 
  createQueryActions 
} from './groupActions';

// Create Context
const GroupContext = createContext<GroupContextType | null>(null);

// Provider Component
export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  // Fetch groups from API
  const refreshGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch groups when user is authenticated
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (currentUser) {
      refreshGroups();
    } else {
      setGroups([]);
      setLoading(false);
    }
  }, [currentUser, authLoading, refreshGroups]);



  // Group management actions
  const { 
    createGroup, 
    getGroup, 
    updateGroup, 
    deleteGroup 
  } = createGroupActions(groups, setGroups, currentUser, toast, setLoading);

  // Song management actions
  const { 
    addSongToGroup, 
    removeSongFromGroup 
  } = createSongActions(groups, setGroups, currentUser, toast, setLoading);

  // Member management actions
  const { 
    addMemberToGroup, 
    removeMemberFromGroup 
  } = createMemberActions(groups, setGroups, currentUser, toast, setLoading);

  // Message management actions
  const { 
    sendMessage, 
    getGroupMessages 
  } = createMessageActions(messages, setMessages, groups, currentUser, toast);

  // Query actions
  const { 
    getOrganizationGroups 
  } = createQueryActions(groups);
  
  // Implement getGroups function
  const getGroups = (filters: { organizationId?: string } = {}) => {
    if (filters && filters.organizationId) {
      return groups.filter(group => group.organizationId === filters.organizationId);
    }
    return groups;
  };

  // Update song transposition via API (silent background sync — no loading spinner or toast)
  const updateSongTransposition = async (
    groupId: string,
    songId: string,
    transposition: number,
    useFlats: boolean = false
  ) => {
    try {
      if (!currentUser) return;

      const currentGroup = groups.find(g => g.id === groupId);
      const existingTranspositions = currentGroup?.songTranspositions || [];
      const songExists = existingTranspositions.some(t => t.songId === songId);

      const newTranspositions = songExists
        ? existingTranspositions.map(t => t.songId === songId ? { ...t, transposition, useFlats } : t)
        : [...existingTranspositions, { songId, transposition, useFlats }];

      // Optimistically update local state first
      setGroups(prev => prev.map(g => g.id === groupId
        ? { ...g, songTranspositions: newTranspositions }
        : g
      ));

      const res = await authFetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          songTranspositions: newTranspositions
        }),
      });

      if (!res.ok) {
        console.error('Failed to sync transposition to server');
      }
    } catch (error) {
      console.error('Transposition sync error:', error);
    }
  };

  // Update song edit states (colors, annotations, section order, etc.) via API
  const updateSongEditStates = async (
    groupId: string,
    editStates: Record<string, import('@/lib/songEditTypes').SongEditState>
  ) => {
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const res = await authFetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ songEditStates: editStates }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save edit states');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
    } catch (error) {
      toast({ title: "Failed to save edits", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    }
  };

  // Update musician assignments via API
  const updateMusicianAssignments = async (
    groupId: string,
    assignments: MusicianAssignment[]
  ) => {
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const res = await authFetch(`/api/groups/${groupId}/musicians`, {
        method: 'PUT',
        body: JSON.stringify({ assignments }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update musician assignments');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
      toast({ title: 'Musicians updated', description: 'Instrument assignments saved successfully' });
    } catch (error) {
      toast({ title: 'Failed to update musicians', description: error instanceof Error ? error.message : 'An unknown error occurred', variant: 'destructive' });
      throw error;
    }
  };

  const value: GroupContextType = {
    groups,
    messages,
    loading,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    addSongToGroup,
    removeSongFromGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    sendMessage,
    getGroupMessages,
    getGroups,
    getOrganizationGroups,
    updateSongTransposition,
    updateSongEditStates,
    updateMusicianAssignments,
    refreshGroups,
  };

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
};

export default GroupContext;
