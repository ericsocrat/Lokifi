import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Load test
    load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'load' },
      startTime: '1m',
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '6m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'], // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Test homepage
  let response = http.get(BASE_URL);
  let result = check(response, {
    'homepage loads': (r) => r.status === 200,
    'homepage load time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!result);
  sleep(1);

  // Test API endpoints
  response = http.get(`${BASE_URL}/api/health`);
  result = check(response, {
    'health check returns 200': (r) => r.status === 200,
    'health check has correct response': (r) => r.json('status') === 'healthy',
  });
  errorRate.add(!result);
  sleep(1);

  // Test symbol directory
  response = http.get(`${BASE_URL}/api/v1/symbols`);
  result = check(response, {
    'symbols API returns 200': (r) => r.status === 200,
    'symbols API returns data': (r) => Array.isArray(r.json('symbols')),
  });
  errorRate.add(!result);
  sleep(1);

  // Test OHLC data
  response = http.get(`${BASE_URL}/api/v1/ohlc/AAPL?timeframe=1D&limit=100`);
  result = check(response, {
    'OHLC API returns 200': (r) => r.status === 200,
    'OHLC API returns data': (r) => Array.isArray(r.json('data')),
  });
  errorRate.add(!result);
  sleep(2);

  // Test multiple symbols concurrently
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
  const requests = symbols.map(symbol => ({
    method: 'GET',
    url: `${BASE_URL}/api/v1/ohlc/${symbol}?timeframe=1D&limit=50`,
  }));

  const responses = http.batch(requests);
  responses.forEach((response, index) => {
    const result = check(response, {
      [`${symbols[index]} OHLC returns 200`]: (r) => r.status === 200,
      [`${symbols[index]} OHLC load time < 3s`]: (r) => r.timings.duration < 3000,
    });
    errorRate.add(!result);
  });

  sleep(3);
}

export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  const scenarios = Object.keys(data.metrics);
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Lokifi Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007acc; }
        .pass { border-left-color: #28a745; }
        .fail { border-left-color: #dc3545; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Lokifi Performance Test Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    <h2>Test Summary</h2>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.1 ? 'pass' : 'fail'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    </div>
    <div class="metric ${data.metrics.http_req_duration.values['p(95)'] < 2000 ? 'pass' : 'fail'}">
        <strong>95th Percentile Response Time:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
    </div>
    <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
    </div>
    <div class="metric">
        <strong>Request Rate:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec
    </div>

    <h2>Detailed Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr>
        ${Object.entries(data.metrics)
          .filter(([key]) => key.startsWith('http_req_'))
          .map(([key, metric]) => `
            <tr>
                <td>${key}</td>
                <td>${JSON.stringify(metric.values, null, 2)}</td>
                <td>${data.thresholds[key] ? data.thresholds[key].join(', ') : 'N/A'}</td>
                <td>${metric.thresholds && Object.values(metric.thresholds).every(t => t.ok) ? '✅' : '❌'}</td>
            </tr>
          `).join('')}
    </table>
</body>
</html>
  `;
}

function textSummary(data, { indent = '', enableColors = false } = {}) {
  const colors = enableColors ? {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
  } : { red: '', green: '', yellow: '', blue: '', reset: '' };

  return `
${colors.blue}${indent}Lokifi Performance Test Summary${colors.reset}
${indent}=====================================

${colors.green}${indent}✓ Scenarios executed: ${Object.keys(data.root_group.groups).length}${colors.reset}
${indent}✓ Total requests: ${data.metrics.http_reqs.values.count}
${indent}✓ Request rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec
${indent}✓ Error rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

${colors.yellow}${indent}Response Times:${colors.reset}
${indent}  • Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  • 95th percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  • 99th percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

${colors.blue}${indent}Threshold Status:${colors.reset}
${Object.entries(data.thresholds || {})
  .map(([metric, thresholds]) => 
    Object.entries(thresholds).map(([threshold, result]) => 
      `${indent}  • ${metric} (${threshold}): ${result.ok ? colors.green + '✓' : colors.red + '✗'} ${colors.reset}`
    ).join('\n')
  ).join('\n')}
`;
}