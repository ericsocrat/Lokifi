import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

// Stress test configuration - push system to limits
export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to normal load
    { duration: '2m', target: 100 },   // Ramp up to high load
    { duration: '2m', target: 200 },   // Ramp up to very high load
    { duration: '2m', target: 400 },   // Spike to extreme load
    { duration: '5m', target: 400 },   // Hold extreme load
    { duration: '2m', target: 600 },   // Push to breaking point
    { duration: '3m', target: 600 },   // Hold at breaking point
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // More relaxed thresholds for stress testing
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'], // Allow 10% failures under stress
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export default function () {
  // Mix of different request types
  const scenarios = [
    () => {
      // Quick health check
      const response = http.get(`${BASE_URL}/api/health`);
      check(response, {
        'health check successful': (r) => r.status === 200,
      }) || errorRate.add(1);
    },
    () => {
      // OHLC data fetch
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const response = http.get(`${BASE_URL}/api/ohlc/${symbol}/1h?limit=200`);
      check(response, {
        'ohlc fetch successful': (r) => r.status === 200,
      }) || errorRate.add(1);
    },
    () => {
      // Batch requests
      const requests = [
        ['GET', `${BASE_URL}/api/ohlc/BTCUSDT/1m?limit=100`],
        ['GET', `${BASE_URL}/api/ohlc/BTCUSDT/5m?limit=100`],
        ['GET', `${BASE_URL}/api/ohlc/BTCUSDT/1h?limit=100`],
      ];
      const responses = http.batch(requests);
      responses.forEach((response) => {
        check(response, {
          'batch request successful': (r) => r.status === 200,
        }) || errorRate.add(1);
      });
    },
  ];

  // Execute random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  // Variable sleep time to simulate real user behavior
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  const summary = {
    test_type: 'stress',
    timestamp: new Date().toISOString(),
    max_vus: data.metrics.vus_max?.values?.max || 0,
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    failure_rate: (data.metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2) + '%',
    avg_response_time: (data.metrics.http_req_duration?.values?.avg || 0).toFixed(2) + 'ms',
    p95_response_time: (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2) + 'ms',
    p99_response_time: (data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2) + 'ms',
    breaking_point_reached: (data.metrics.http_req_failed?.values?.rate || 0) > 0.5,
  };

  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
  };
}
