/**
 * API client with response validation using zod
 */
import type {
  HealthResponse,
  OHLCRequest,
  OHLCResponse,
  SymbolSearchRequest,
  SymbolsResponse,
  TickerResponse,
} from 'types/api';
import { z } from 'zod';

// Zod schemas for validation
const OHLCBarSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

const SymbolSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  base_asset: z.string(),
  quote_asset: z.string(),
  exchange: z.string(),
  type: z.string(),
  active: z.boolean(),
  logo_url: z.string().optional(),
});

const APIResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string(),
  version: z.string(),
});

const SymbolsResponseSchema = APIResponseSchema.extend({
  data: z.array(SymbolSchema),
  total: z.number(),
});

const OHLCResponseSchema = APIResponseSchema.extend({
  data: z.array(OHLCBarSchema),
  symbol: z.string(),
  timeframe: z.string(),
  from_timestamp: z.number().optional(),
  to_timestamp: z.number().optional(),
});

const TickerDataSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change_24h: z.number(),
  volume_24h: z.number(),
  high_24h: z.number(),
  low_24h: z.number(),
  timestamp: z.number(),
});

const TickerResponseSchema = APIResponseSchema.extend({
  data: TickerDataSchema,
});

const HealthResponseSchema = APIResponseSchema.extend({
  status: z.string(),
  uptime: z.number(),
  api_version: z.string(),
  dependencies: z.record(z.string(), z.string()),
});

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  timestamp: z.string(),
  version: z.string(),
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export class APIClient {
  private baseURL: string;
  private abortController: AbortController | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema: z.ZodSchema<T>
  ): Promise<T> {
    // Abort previous request if still pending
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: this.abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode = 'HTTP_ERROR';
      let errorDetails: unknown;

      try {
        const errorData = await response.json();
        const parsedError = ErrorResponseSchema.safeParse(errorData);

        if (parsedError.success) {
          // Backend returned valid error schema
          errorMessage = parsedError.data.error || errorMessage;
          errorCode = parsedError.data.code || errorCode;
          errorDetails = parsedError.data.details;
        } else {
          // Backend returned JSON but not in expected format - preserve it
          errorDetails = errorData;
          console.warn('[APIClient] Received error response not matching schema:', {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
            parseErrors: parsedError.error?.errors,
          });
        }
      } catch (jsonError) {
        // Could not parse JSON - fallback to statusText
        console.warn('[APIClient] Could not parse error response as JSON:', {
          status: response.status,
          statusText: response.statusText,
          parseError: jsonError instanceof Error ? jsonError.message : String(jsonError),
        });
      }

      throw new APIError(errorMessage, errorCode, response.status, errorDetails);
    }

    const data = await response.json();
    const result = schema.safeParse(data);

    if (!result.success) {
      console.error('API response validation failed:', result.error);
      throw new APIError('Invalid response format from server', 'VALIDATION_ERROR', 500);
    }

    return result.data;
  }

  async getSymbols(params?: SymbolSearchRequest): Promise<SymbolsResponse> {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(
      `/api/symbols${query ? `?${query}` : ''}`,
      { method: 'GET' },
      SymbolsResponseSchema
    );
  }

  async getOHLC(params: OHLCRequest): Promise<OHLCResponse> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/ohlc?${query}`, { method: 'GET' }, OHLCResponseSchema);
  }

  async getTicker(symbol: string): Promise<TickerResponse> {
    return this.request(
      `/api/ticker/${encodeURIComponent(symbol)}`,
      { method: 'GET' },
      TickerResponseSchema
    );
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request('/api/health', { method: 'GET' }, HealthResponseSchema);
  }

  // Cancel ongoing requests
  cancelRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Global API client instance
export const apiClient = new APIClient();

// Install dependencies for this to work
// npm install zod
