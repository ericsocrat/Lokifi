import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 50 },    // Stay at 50 users for 3 minutes
    { duration: '1m', target: 100 },   // Spike to 100 users
    { duration: '2m', target: 100 },   // Stay at peak for 2 minutes
    { duration: '1m', target: 200 },   // Spike to 200 users
    { duration: '1m', target: 200 },   // Hold spike
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Less than 1% of requests should fail
    http_req_failed: ['rate<0.01'],
    // Error rate should be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

// Test scenarios
export default function () {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/api/health`);

    check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response < 100ms': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);

    apiResponseTime.add(response.timings.duration);
  });

  sleep(1);

  group('OHLC Data Fetch', () => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];

    const response = http.get(`${BASE_URL}/api/ohlc/${symbol}/${timeframe}?limit=100`);

    check(response, {
      'ohlc status is 200': (r) => r.status === 200,
      'ohlc response < 500ms': (r) => r.timings.duration < 500,
      'ohlc returns candles': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.candles && Array.isArray(data.candles);
        } catch (e) {
          return false;
        }
      },
      'ohlc data structure valid': (r) => {
        try {
          const data = JSON.parse(r.body);
          if (data.candles && data.candles.length > 0) {
            const candle = data.candles[0];
            return (
              typeof candle.timestamp === 'number' &&
              typeof candle.open === 'number' &&
              typeof candle.high === 'number' &&
              typeof candle.low === 'number' &&
              typeof candle.close === 'number' &&
              typeof candle.volume === 'number'
            );
          }
          return true;
        } catch (e) {
          return false;
        }
      },
    }) || errorRate.add(1);

    apiResponseTime.add(response.timings.duration);
  });

  sleep(1);

  group('Concurrent Symbol Requests', () => {
    const requests = [
      ['GET', `${BASE_URL}/api/ohlc/BTCUSDT/1h?limit=50`],
      ['GET', `${BASE_URL}/api/ohlc/ETHUSDT/1h?limit=50`],
      ['GET', `${BASE_URL}/api/ohlc/BNBUSDT/1h?limit=50`],
    ];

    const responses = http.batch(requests);

    responses.forEach((response) => {
      check(response, {
        'concurrent request successful': (r) => r.status === 200,
        'concurrent request fast': (r) => r.timings.duration < 1000,
      }) || errorRate.add(1);
    });
  });

  sleep(2);

  group('Large Data Request', () => {
    const response = http.get(`${BASE_URL}/api/ohlc/BTCUSDT/1m?limit=500`);

    check(response, {
      'large data status is 200': (r) => r.status === 200,
      'large data response < 1000ms': (r) => r.timings.duration < 1000,
      'large data complete': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.candles && data.candles.length > 0;
        } catch (e) {
          return false;
        }
      },
    }) || errorRate.add(1);
  });

  sleep(1);
}

// Teardown function
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs / 1000,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values?.count || 0,
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg || 0,
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)'] || 0,
      http_req_failed: data.metrics.http_req_failed?.values?.rate || 0,
      error_rate: data.metrics.errors?.values?.rate || 0,
      vus_max: data.metrics.vus_max?.values?.max || 0,
    },
    thresholds_passed: Object.keys(data.metrics).every(
      (metric) => !data.metrics[metric].thresholds ||
      Object.values(data.metrics[metric].thresholds).every((t) => t.ok)
    ),
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-results.json': JSON.stringify(summary, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors;

  let output = '\n\n';
  output += `${indent}✓ checks.........................: ${data.metrics.checks?.values?.rate * 100 || 0}%\n`;
  output += `${indent}✓ http_reqs.....................: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  output += `${indent}✓ http_req_duration..............: avg=${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms p(95)=${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms\n`;
  output += `${indent}✓ http_req_failed................: ${(data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%\n`;
  output += `${indent}✓ vus............................: ${data.metrics.vus?.values?.value || 0}\n`;

  return output;
}
