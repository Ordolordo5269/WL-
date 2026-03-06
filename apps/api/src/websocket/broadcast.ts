import type { ConflictUpdatePayload } from './conflict-socket';

// Holds the broadcast function once the WebSocket server is initialized
let _broadcast: ((payload: ConflictUpdatePayload) => void) | null = null;

export function setBroadcaster(fn: (payload: ConflictUpdatePayload) => void) {
  _broadcast = fn;
}

export function broadcastConflictUpdate(payload: ConflictUpdatePayload) {
  if (_broadcast) {
    _broadcast(payload);
  }
}
