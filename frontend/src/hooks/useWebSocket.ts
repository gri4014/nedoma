import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';
import { WebSocketEvents, DashboardStatsPayload } from '../types/websocket';

type UseWebSocketOptions = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onStatsUpdate?: (data: DashboardStatsPayload) => void;
  onEvent?: {
    [key in WebSocketEvents]?: (data: any) => void;
  };
};

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = socketService.connect(localStorage.getItem('token'));
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      options.onConnect?.();
    });

    newSocket.on('disconnect', (reason: string) => {
      setIsConnected(false);
      options.onDisconnect?.();
    });

    if (options.onStatsUpdate) {
      newSocket.on(WebSocketEvents.DASHBOARD_STATS_UPDATED, options.onStatsUpdate);
    }

    // Set up event listeners
    if (options.onEvent) {
      Object.entries(options.onEvent).forEach(([event, handler]) => {
        newSocket.on(event, handler);
      });
    }

    return () => {
      if (options.onStatsUpdate) {
        newSocket.off(WebSocketEvents.DASHBOARD_STATS_UPDATED, options.onStatsUpdate);
      }
      
      // Clean up event listeners
      if (options.onEvent) {
        Object.entries(options.onEvent).forEach(([event, handler]) => {
          newSocket.off(event, handler);
        });
      }
      socketService.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [options.onConnect, options.onDisconnect, options.onStatsUpdate]);

  return {
    socket,
    isConnected
  };
};
