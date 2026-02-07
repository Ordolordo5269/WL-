import { io, type Socket } from 'socket.io-client';

type ConflictUpdateType = 'created' | 'updated' | 'deleted' | 'status-changed' | 'casualty-updated';

export interface ConflictUpdateMessage {
  id: string;
  type: ConflictUpdateType;
  data?: any;
}

type ConflictUpdateHandler = (msg: ConflictUpdateMessage) => void;

class ConflictWebSocketService {
  private socket: Socket | null = null;
  private readonly PATH = '/ws/conflicts';

  connect(onUpdate: ConflictUpdateHandler) {
    if (this.socket?.connected) return;

    this.socket = io('', {
      path: this.PATH,
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to conflict updates');
    });

    this.socket.on('disconnect', () => {
      console.log('[WS] Disconnected from conflict updates');
    });

    this.socket.on('conflict:update', (payload: ConflictUpdateMessage) => {
      onUpdate?.(payload);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const conflictWebSocketService = new ConflictWebSocketService();














