'use client';
import { useEffect, useRef, useState } from 'react';
import { useMarketDataStore } from '../lib/marketDataStore';

interface WebSocketConnectionProps {
  enabled?: boolean;
  symbols?: string[];
}

export default function WebSocketConnection({
  enabled = false,
  symbols = [],
}: WebSocketConnectionProps) {
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const { fetchOHLCData } = useMarketDataStore();

  // Simulated WebSocket connection for demo
  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      disconnect();
      return;
    }

    connect();

    return () => {
      disconnect();
    };
  }, [enabled, symbols]);

  const connect = () => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return;
    }

    setConnectionStatus('connecting');
    console.log('Attempting WebSocket connection...');

    // Simulate WebSocket connection
    // In a real implementation, this would be: new WebSocket('wss://your-websocket-url')
    const simulateWebSocket = () => {
      setConnectionStatus('connected');
      setLastUpdate(new Date());
      reconnectAttempts.current = 0;

      console.log('WebSocket connected (simulated)');

      // Simulate periodic updates
      const updateInterval = setInterval(() => {
        // Check if still connected using ref to avoid closure issues
        if (!enabled) {
          clearInterval(updateInterval);
          return;
        }

        // Simulate price updates
        symbols.forEach((symbol) => {
          const mockUpdate = {
            symbol,
            price: Math.random() * 1000 + 100,
            change: (Math.random() - 0.5) * 10,
            volume: Math.floor(Math.random() * 1000000),
            timestamp: new Date().toISOString(),
          };

          console.log('WebSocket update (simulated):', mockUpdate);
          setMessageCount((prev) => prev + 1);
          setLastUpdate(new Date());
        });
      }, 5000); // Update every 5 seconds

      // Simulate connection management
      return {
        close: () => {
          clearInterval(updateInterval);
          setConnectionStatus('disconnected');
        },
        send: (data: string) => {
          console.log('WebSocket send (simulated):', data);
        },
      };
    };

    // Simulate connection delay
    setTimeout(() => {
      if (Math.random() > 0.1) {
        // 90% success rate
        const mockWs = simulateWebSocket();
        wsRef.current = mockWs as any;
      } else {
        // Simulate connection error
        setConnectionStatus('error');
        scheduleReconnect();
      }
    }, 1000);
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus('disconnected');
    setMessageCount(0);
    setLastUpdate(null);
    reconnectAttempts.current = 0;
  };

  const scheduleReconnect = () => {
    if (reconnectAttempts.current >= 5) {
      console.log('Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff
    reconnectAttempts.current++;

    console.log(`Scheduling reconnection attempt ${reconnectAttempts.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (enabled && symbols.length > 0) {
        connect();
      }
    }, delay);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-trading-gain';
      case 'connecting':
        return 'text-secondary';
      case 'error':
        return 'text-trading-loss';
      default:
        return 'text-text-tertiary';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-bg-secondary border border-border-default rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-trading-gain' : connectionStatus === 'connecting' ? 'bg-secondary animate-pulse' : 'bg-trading-loss'}`}
          />
          <span className={`text-xs font-medium ${getStatusColor()}`}>{getStatusText()}</span>
        </div>

        <div className="text-xs text-text-secondary space-y-1">
          <div>Symbols: {symbols.length}</div>
          {connectionStatus === 'connected' && (
            <>
              <div>Messages: {messageCount}</div>
              {lastUpdate && <div>Last: {lastUpdate.toLocaleTimeString()}</div>}
            </>
          )}
          {reconnectAttempts.current > 0 && connectionStatus !== 'connected' && (
            <div className="text-secondary">Retry: {reconnectAttempts.current}/5</div>
          )}
        </div>

        {connectionStatus === 'error' && (
          <button
            onClick={() => {
              reconnectAttempts.current = 0;
              connect();
            }}
            className="mt-2 w-full text-xs bg-primary hover:bg-primary-light text-white px-2 py-1 rounded transition-smooth"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

// Hook to use WebSocket in components
export function useWebSocketData(symbol: string, enabled: boolean = true) {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !symbol) return;

    // This would typically subscribe to WebSocket updates for the specific symbol
    console.log(`Subscribing to WebSocket data for ${symbol}`);
    setIsConnected(true);

    // Simulate data updates
    const interval = setInterval(() => {
      const mockData = {
        symbol,
        price: Math.random() * 1000 + 100,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(),
      };
      setData(mockData);
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
      console.log(`Unsubscribing from WebSocket data for ${symbol}`);
    };
  }, [symbol, enabled]);

  return { data, isConnected };
}
