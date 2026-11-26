import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '15s',
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

const baseUrl = __ENV.BASE_URL || 'http://host.docker.internal:3000';

export default function () {
  const health = http.get(`${baseUrl}/api/health`, { tags: { name: 'health' } });
  check(health, {
    'health status is 200': (response) => response.status === 200,
  });

  sleep(1);
}
