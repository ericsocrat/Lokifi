/**
 * Backend Price Service - Integration with Tasks 6-8
 * 
 * This service connects the frontend to the new backend features:
 * - Task 6: Historical Price Data & OHLCV
 * - Task 7: Expanded Crypto Support (300+ cryptos)
 * - Task 8: WebSocket Real-Time Updates
 * 
 * Created: October 6, 2025
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoricalPricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

export interface HistoricalPriceResponse {
  success: boolean;
  symbol: string;
  period: string;
  count: number;
  data: HistoricalPricePoint[];
  source: string;
  cached: boolean;
}

export interface OHLCVCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVResponse {
  success: boolean;
  symbol: string;
  period: string;
  resolution: string;
  count: number;
  candles: OHLCVCandle[];
  source: string;
  cached: boolean;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CryptoListResponse {
  success: boolean;
  count: number;
  cryptos: CryptoAsset[];
  cached: boolean;
}

export interface CryptoSearchResponse {
  success: boolean;
  query: string;
  count: number;
  results: CryptoAsset[];
}

export interface PriceUpdate {
  [symbol: string]: {
    price: number;
    change: number;
    change_percent: number;
    volume?: number;
    market_cap?: number;
    high_24h?: number;
    low_24h?: number;
    last_updated: string;
    source: string;
  };
}

export interface WebSocketMessage {
  type: 'price_update' | 'welcome' | 'subscribed' | 'unsubscribed' | 'error' | 'pong';
  client_id?: string;
  message?: string;
  data?: PriceUpdate;
  symbols?: string[];
  timestamp?: string;
  error?: string;
}

// ============================================================================
// HISTORICAL DATA SERVICE (Task 6)
// ============================================================================

export class HistoricalDataService {
  /**
   * Fetch historical price data for a symbol
   * @param symbol Stock or crypto symbol (e.g., 'AAPL', 'BTC')
   * @param period Time period: '1d', '1w', '1m', '3m', '6m', '1y', '5y', 'all'
   */
  static async getHistory(
    symbol: string,
    period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all' = '1m'
  ): Promise<HistoricalPriceResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/prices/${symbol}/history?period=${period}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch history for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch OHLCV candlestick data for technical analysis
   * @param symbol Stock or crypto symbol
   * @param period Time period
   * @param resolution Candle resolution: '1', '5', '15', '60', 'D', 'W', 'M'
   */
  static async getOHLCV(
    symbol: string,
    period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y' | 'all' = '1m',
    resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M' = 'D'
  ): Promise<OHLCVResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/prices/${symbol}/ohlcv?period=${period}&resolution=${resolution}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch OHLCV for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch historical data for multiple symbols
   */
  static async getBatchHistory(
    symbols: string[],
    period: string = '1m'
  ): Promise<Map<string, HistoricalPriceResponse>> {
    const results = new Map<string, HistoricalPriceResponse>();
    
    await Promise.all(
      symbols.map(async (symbol: any) => {
        try {
          const data = await this.getHistory(symbol, period as any);
          results.set(symbol, data);
        } catch (error) {
          console.error(`Failed to fetch history for ${symbol}:`, error);
        }
      })
    );
    
    return results;
  }
}

// ============================================================================
// CRYPTO DISCOVERY SERVICE (Task 7)
// ============================================================================

export class CryptoDiscoveryService {
  /**
   * Get top cryptocurrencies by market cap
   * @param limit Number of cryptos to fetch (default: 100, max: 300)
   */
  static async getTopCryptos(limit: number = 100): Promise<CryptoListResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/prices/crypto/top?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch top cryptos:', error);
      throw error;
    }
  }

  /**
   * Search for cryptocurrencies by name or symbol
   * @param query Search query (e.g., 'bitcoin', 'eth', 'doge')
   */
  static async searchCryptos(query: string): Promise<CryptoSearchResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/prices/crypto/search?q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to search cryptos with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get symbol to CoinGecko ID mapping
   * Useful for converting symbols like 'BTC' to 'bitcoin'
   */
  static async getSymbolMapping(): Promise<{ [symbol: string]: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/prices/crypto/mapping`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.mapping || {};
    } catch (error) {
      console.error('Failed to fetch crypto mapping:', error);
      throw error;
    }
  }
}

// ============================================================================
// WEBSOCKET REAL-TIME SERVICE (Task 8)
// ============================================================================

export class WebSocketPriceService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private subscribers: Map<string, Set<(data: PriceUpdate) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions: Set<string> = new Set();

  constructor(clientId?: string) {
    this.clientId = clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve: any, reject: any) => {
      try {
        const wsUrl = `${WS_BASE_URL}/ws/prices?client_id=${this.clientId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Resubscribe to previous subscriptions
          if (this.subscriptions.size > 0) {
            this.subscribe(Array.from(this.subscriptions));
          }
          
          resolve();
        };

        this.ws.onmessage = (event: any) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error: any) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.ws = null;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'welcome':
        console.log(`🎉 ${message.message}`);
        break;

      case 'price_update':
        if (message.data) {
          // Notify all subscribers
          this.subscribers.forEach((callbacks: any) => {
            callbacks.forEach((callback) => {
              callback(message.data!);
            });
          });
        }
        break;

      case 'subscribed':
        console.log(`✅ Subscribed to: ${message.symbols?.join(', ')}`);
        break;

      case 'unsubscribed':
        console.log(`❌ Unsubscribed from: ${message.symbols?.join(', ')}`);
        break;

      case 'error':
        console.error('WebSocket error:', message.error);
        break;

      case 'pong':
        console.log('🏓 Pong received');
        break;
    }
  }

  /**
   * Subscribe to price updates for symbols
   */
  subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected. Storing subscriptions for later.');
      symbols.forEach((s: any) => this.subscriptions.add(s));
      return;
    }

    symbols.forEach((s: any) => this.subscriptions.add(s));

    this.ws.send(JSON.stringify({
      action: 'subscribe',
      symbols: symbols
    }));
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    symbols.forEach((s: any) => this.subscriptions.delete(s));

    this.ws.send(JSON.stringify({
      action: 'unsubscribe',
      symbols: symbols
    }));
  }

  /**
   * Add a callback for price updates
   */
  onPriceUpdate(callback: (data: PriceUpdate) => void): () => void {
    const id = Math.random().toString(36);
    
    if (!this.subscribers.has('global')) {
      this.subscribers.set('global', new Set());
    }
    
    this.subscribers.get('global')!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get('global');
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'ping' }));
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error: any) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.subscriptions.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// SINGLETON WEBSOCKET INSTANCE
// ============================================================================

let wsInstance: WebSocketPriceService | null = null;

/**
 * Get singleton WebSocket instance
 */
export function getWebSocketService(): WebSocketPriceService {
  if (!wsInstance) {
    wsInstance = new WebSocketPriceService();
  }
  return wsInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  HistoricalDataService,
  CryptoDiscoveryService,
  WebSocketPriceService,
  getWebSocketService,
};
