import { io, type Socket } from 'socket.io-client';

type ConflictUpdateType = 'created' | 'updated' | 'deleted' | 'status-changed' | 'casualty-updated';

export interface ConflictUpdateMessage {
  id: string;
  type: ConflictUpdateType;
  data?: any;
}

type ConflictUpdateHandler = (msg: ConflictUpdateMessage) => void;

// Backend URL — never the Vite dev server port
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ConflictWebSocketService {
  private socket: Socket | null = null;
  private handler: ConflictUpdateHandler | null = null;
  private readonly PATH = '/ws/conflicts';

  connect(onUpdate: ConflictUpdateHandler) {
    // Store latest handler without reconnecting
    this.handler = onUpdate;

    // Guard: don't create a second socket while one is already connecting or connected
    if (this.socket) return;

    this.socket = io(BACKEND_URL, {
      path: this.PATH,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to conflict updates');
    });

    this.socket.on('disconnect', () => {
      console.log('[WS] Disconnected from conflict updates');
    });

    this.socket.on('conflict:update', (payload: ConflictUpdateMessage) => {
      this.handler?.(payload);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.handler = null;
    }
  }
}

export const conflictWebSocketService = new ConflictWebSocketService();











