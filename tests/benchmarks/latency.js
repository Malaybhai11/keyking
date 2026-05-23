import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'], // 99th percentile < 100ms
    http_req_failed: ['rate<0.01'],   // < 1% failure rate
  },
};

export default function () {
  const res = http.post('http://localhost:8787/v1/chat/completions', JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}
