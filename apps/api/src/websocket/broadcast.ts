// Conflict WebSocket broadcasting has been removed.
// This module is kept as a no-op stub for any remaining references.

export interface ConflictUpdatePayload {
  [key: string]: unknown;
}

let _broadcast: ((payload: ConflictUpdatePayload) => void) | null = null;

export function setBroadcaster(fn: (payload: ConflictUpdatePayload) => void) {
  _broadcast = fn;
}

export function broadcastConflictUpdate(payload: ConflictUpdatePayload) {
  if (_broadcast) {
    _broadcast(payload);
  }
}
