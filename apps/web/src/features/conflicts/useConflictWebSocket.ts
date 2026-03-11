import { useEffect, useRef } from 'react';
import { conflictWebSocketService, type ConflictUpdateMessage } from './services/conflict-websocket';

export function useConflictWebSocket(onUpdate: (update: ConflictUpdateMessage) => void) {
  // Keep a stable ref to the latest callback so the socket never needs to reconnect
  // when the parent re-renders with a new inline function reference.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    conflictWebSocketService.connect((msg) => onUpdateRef.current(msg));

    return () => {
      conflictWebSocketService.disconnect();
    };
  }, []); // connect once, disconnect on unmount
}











