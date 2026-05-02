import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

/**
 * Initializes the Socket.io server and defines global event handlers.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    
    // Subscribe to specific server metrics
    socket.on('subscribe:server', (serverId: string) => {
      socket.join(`server:${serverId}`);
      console.log(`[WS] Client ${socket.id} subscribed to server:${serverId}`);
    });
    
    socket.on('unsubscribe:server', (serverId: string) => {
      socket.leave(`server:${serverId}`);
      console.log(`[WS] Client ${socket.id} unsubscribed from server:${serverId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emits real-time metrics to clients subscribed to a specific server.
 */
export function emitServerMetrics(serverId: string, metrics: any): void {
  if (io) {
    io.to(`server:${serverId}`).emit('metrics:update', { ...metrics, serverId });
  }
}

/**
 * Emits a new incident event globally.
 */
export function emitIncident(incident: any): void {
  if (io) {
    io.emit('incident:new', incident);
  }
}

/**
 * Emits a system notification/alert globally.
 */
export function emitNotification(message: string, severity: string): void {
  if (io) {
    io.emit('notification:alert', { 
      message, 
      severity, 
      timestamp: new Date().toISOString() 
    });
  }
}
