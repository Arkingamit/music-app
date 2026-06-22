import { Group, GroupInput, GroupUpdateInput, Message, MessageInput } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { authFetch } from '@/contexts/AuthContext';

// Actions for group operations
export const createGroupActions = (
  groups: Group[],
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>,
  currentUser: User | null,
  toast: ReturnType<typeof useToast>["toast"],
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const createGroup = async (groupInput: GroupInput): Promise<string> => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in to create a group');

      const res = await authFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupInput),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');

      setGroups(prev => [...prev, data.group]);
      toast({ title: "Group created", description: `${data.group.name} has been created successfully` });
      return data.group.id;
    } catch (error) {
      toast({ title: "Failed to create group", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getGroup = (id: string) => groups.find(group => group.id === id);

  const updateGroup = async (id: string, updatedGroupData: GroupUpdateInput) => {
    const existingGroup = groups.find(g => g.id === id);
    if (existingGroup) {
      const keys = Object.keys(updatedGroupData) as Array<keyof GroupUpdateInput>;
      const hasChanges = keys.some(key => {
        if (key === 'songTranspositions' || key === 'members' || key === 'songs' || key === 'songEditStates') {
          return JSON.stringify(updatedGroupData[key]) !== JSON.stringify(existingGroup[key]);
        }
        return updatedGroupData[key] !== existingGroup[key];
      });

      if (!hasChanges) {
        return;
      }
    }

    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in to update a group');

      const res = await authFetch(`/api/groups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedGroupData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update group');

      setGroups(prev => prev.map(g => g.id === id ? data.group : g));
      toast({ title: "Group updated", description: `${data.group.name} has been updated successfully` });
    } catch (error) {
      toast({ title: "Failed to update group", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (id: string) => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in to delete a group');

      const group = groups.find(g => g.id === id);
      if (!group) throw new Error('Group not found');

      const res = await authFetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete group');
      }

      setGroups(prev => prev.filter(g => g.id !== id));
      toast({ title: "Group deleted", description: `${group.name} has been deleted successfully` });
    } catch (error) {
      toast({ title: "Failed to delete group", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createGroup, getGroup, updateGroup, deleteGroup };
};

export const createSongActions = (
  groups: Group[],
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>,
  currentUser: User | null,
  toast: ReturnType<typeof useToast>["toast"],
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const addSongToGroup = async (groupId: string, songId: string) => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const res = await authFetch(`/api/groups/${groupId}/songs`, {
        method: 'POST',
        body: JSON.stringify({ songId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add song');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
      toast({ title: "Song added to group", description: `Song has been added successfully` });
    } catch (error) {
      toast({ title: "Failed to add song to group", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeSongFromGroup = async (groupId: string, songId: string) => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const res = await authFetch(`/api/groups/${groupId}/songs`, {
        method: 'DELETE',
        body: JSON.stringify({ songId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove song');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
      toast({ title: "Song removed from group", description: `Song has been removed successfully` });
    } catch (error) {
      toast({ title: "Failed to remove song from group", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { addSongToGroup, removeSongFromGroup };
};

export const createMemberActions = (
  groups: Group[],
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>,
  currentUser: User | null,
  toast: ReturnType<typeof useToast>["toast"],
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const addMemberToGroup = async (groupId: string, userId: string) => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Group not found');

      const res = await authFetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ members: [...group.members, userId] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
      toast({ title: "Member added to group", description: `User has been added successfully` });
    } catch (error) {
      toast({ title: "Failed to add member", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    setLoading(true);
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Group not found');

      const res = await authFetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({ members: group.members.filter(m => m !== userId) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');

      setGroups(prev => prev.map(g => g.id === groupId ? data.group : g));
      toast({ title: "Member removed from group", description: `User has been removed successfully` });
    } catch (error) {
      toast({ title: "Failed to remove member", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { addMemberToGroup, removeMemberFromGroup };
};

export const createMessageActions = (
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  groups: Group[],
  currentUser: User | null,
  toast: ReturnType<typeof useToast>["toast"]
) => {
  const sendMessage = async (messageInput: MessageInput) => {
    try {
      if (!currentUser) throw new Error('You must be logged in');

      const res = await authFetch(`/api/groups/${messageInput.groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: messageInput.content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      toast({ title: "Failed to send message", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
      throw error;
    }
  };

  const getGroupMessages = (groupId: string) => {
    return messages.filter(message => message.groupId === groupId);
  };

  return { sendMessage, getGroupMessages };
};

export const createQueryActions = (groups: Group[]) => {
  const getOrganizationGroups = (organizationId: string) => {
    return groups.filter(group => group.organizationId === organizationId);
  };

  return { getOrganizationGroups };
};
