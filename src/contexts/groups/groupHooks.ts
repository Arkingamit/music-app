
import { useContext } from 'react';
import GroupContext from './groupContext';
import { GroupContextType } from './types';

export const useGroups = (): GroupContextType => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroups must be used within a GroupProvider');
  }
  return context;
};
