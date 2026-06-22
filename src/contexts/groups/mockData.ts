
import { Group, Message } from '@/lib/types';

// Mock groups data
export const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Jan-1',
    description: '',
    createdBy: '1',
    createdAt: new Date().toISOString(),
    organizationId: '1', 
    members: ['1', '2'],
    songs: ['1', '2']
  },
  {
    id: '2',
    name: 'wednesday',
    description: '',
    createdBy: '2',
    createdAt: new Date().toISOString(),
    organizationId: '2',
    members: ['1', '2'],
    songs: ['2','1']
  }
];

// Mock messages data
export const mockMessages: Message[] = [
  {
    id: '1',
    content: '',
    createdBy: '1',
    createdAt: new Date().toISOString(),
    groupId: '1'
  },
  {
    id: '2',
    content: '',
    createdBy: '2',
    createdAt: new Date().toISOString(),
    groupId: '1'
  },{
    id: '3',
    content: '',
    createdBy: '3',
    createdAt: new Date().toISOString(),
    groupId: '1'
  }
];
