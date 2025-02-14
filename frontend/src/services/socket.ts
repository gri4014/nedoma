import { io, Socket } from 'socket.io-client';
import { WebSocketEvents } from '../types/websocket';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private readonly SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3000';

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(token: string | null): Socket {
    if (!this.socket) {
      this.socket = io(this.SOCKET_URL, {
        transports: ['websocket'],
        auth: { token }
      });
    }
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = SocketService.getInstance();
