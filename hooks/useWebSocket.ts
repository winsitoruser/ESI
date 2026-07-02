/**
 * React Hook for WebSocket Connection
 * Used in kitchen display and other real-time components
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type WebSocketEventType = 
  | 'kitchen:order:new'
  | 'kitchen:order:update'
  | 'kitchen:order:complete'
  | 'kitchen:order:cancel'
  | 'kitchen:activity:new'
  | 'kitchen:staff:update'
  | 'kitchen:inventory:update'
  | 'table:status:change'
  | 'inventory:alert'
  | 'inventory:stock:update'
  | 'inventory:transfer:update'
  | 'inventory:rac:update'
  | 'notification:new'
  | 'branch:metrics:update'
  | 'report:sales:update'
  | 'report:inventory:update'
  | 'pos:transaction:complete'
  | 'pos:transaction:void'
  | 'hq:branch:sale'
  | 'hq:branch:kitchen'
  | 'hq:branch:alert'
  | 'hq:branch:staff'
  | 'hq:branch:sync'
  | 'hq:realtime:update'
  | 'hris:attendance:update'
  | 'hris:kpi:update'
  | 'hris:performance:update'
  | 'hris:employee:update'
  | 'finance:revenue:update'
  | 'finance:expense:update'
  | 'finance:cashflow:update'
  | 'finance:invoice:update'
  | 'finance:alert';

export interface WebSocketMessage {
  event: WebSocketEventType;
  data: any;
  branchId?: string;
  timestamp: string;
}

interface UseWebSocketOptions {
  branchId: string;
  role?: string;
  events?: WebSocketEventType[];
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  reconnectAttempts: number;
  error: string | null;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    branchId,
    role = 'kitchen',
    events = ['kitchen:order:new', 'kitchen:order:update', 'kitchen:order:complete'],
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    lastMessage: null,
    reconnectAttempts: 0,
    error: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<any[]>([]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?branchId=${branchId}&role=${role}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          error: null
        }));

        // Subscribe to events
        ws.send(JSON.stringify({
          type: 'subscribe',
          events
        }));

        // Send any queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          ws.send(JSON.stringify(message));
        }

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
        onDisconnect?.();

        // Attempt to reconnect
        if (state.reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
            connect();
          }, reconnectInterval);
        } else {
          setState(prev => ({ ...prev, error: 'Max reconnect attempts reached' }));
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket error occurred' }));
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect'
      }));
    }
  }, [branchId, role, events, onConnect, onDisconnect, onMessage, onError, reconnectInterval, maxReconnectAttempts, state.reconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
  }, []);

  // Send message
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message for later
      messageQueueRef.current.push(message);
      return false;
    }
  }, []);

  // Subscribe to additional events
  const subscribe = useCallback((newEvents: WebSocketEventType[]) => {
    sendMessage({ type: 'subscribe', events: newEvents });
  }, [sendMessage]);

  // Unsubscribe from events
  const unsubscribe = useCallback((removeEvents: WebSocketEventType[]) => {
    sendMessage({ type: 'unsubscribe', events: removeEvents });
  }, [sendMessage]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe
  };
}

export default useWebSocket;
