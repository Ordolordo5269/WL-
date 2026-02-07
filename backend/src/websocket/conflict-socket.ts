import type { Server } from 'http';
import { Server as SocketIOServer, type Socket } from 'socket.io';

export interface ConflictUpdatePayload {
  id: string;
  type: 'created' | 'updated' | 'deleted' | 'status-changed' | 'casualty-updated';
  data?: any;
}

export function createConflictSocketServer(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    path: '/ws/conflicts',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('[WS] Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('[WS] Client disconnected:', socket.id);
    });
  });

  const broadcastConflictUpdate = (payload: ConflictUpdatePayload) => {
    io.emit('conflict:update', payload);
  };

  return {
    io,
    broadcastConflictUpdate
  };
}


