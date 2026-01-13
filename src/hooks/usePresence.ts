import { useEffect, useState } from 'react';
import {
  subscribeToUserPresence,
  subscribeToMultipleUsersPresence,
} from '../services/presenceService';

export const useUserPresence = (userId: string) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'away'>('offline');

  useEffect(() => {
    const unsubscribe = subscribeToUserPresence(userId, (newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return status;
};

export const useMultipleUsersPresence = (userIds: string[]) => {
  const [presenceMap, setPresenceMap] = useState<Record<string, 'online' | 'offline' | 'away'>>(
    {}
  );

  useEffect(() => {
    if (userIds.length === 0) return;

    const unsubscribe = subscribeToMultipleUsersPresence(userIds, (newPresenceMap) => {
      setPresenceMap(newPresenceMap);
    });

    return () => {
      unsubscribe();
    };
  }, [userIds.join(',')]);

  return presenceMap;
};
