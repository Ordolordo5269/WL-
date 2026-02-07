import { useEffect } from 'react';
import { conflictWebSocketService, type ConflictUpdateMessage } from '../services/conflict-websocket';
import type { Conflict } from '../src/types';

export function useConflictWebSocket(onUpdateConflictList: (update: ConflictUpdateMessage) => void) {
  useEffect(() => {
    conflictWebSocketService.connect(onUpdateConflictList);

    return () => {
      conflictWebSocketService.disconnect();
    };
  }, [onUpdateConflictList]);
}











