import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://host.docker.internal:3000';
const vus = Number.parseInt(__ENV.VUS || '1', 10);
const duration = __ENV.DURATION || '60s';
const partySize = Number.parseInt(__ENV.PARTY_SIZE || '2', 10);
const pacingSeconds = Number.parseInt(__ENV.PACING_SECONDS || (vus >= 5 ? '10' : '5'), 10);

export const options = {
  scenarios: {
    reservation_availability: {
      executor: 'constant-vus',
      vus,
      duration,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export function setup() {
  const response = http.get(`${baseUrl}/api/locations`);
  check(response, {
    'locations API returns 200': (res) => res.status === 200,
  });
  const locations = response.json('data');
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('No seeded location is available for reservation load testing');
  }

  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { locationId: locations[0].id, date };
}

export default function reservationAvailability({ locationId, date }) {
  const url = `${baseUrl}/api/reservations/availability?locationId=${encodeURIComponent(locationId)}&date=${date}&partySize=${partySize}`;
  const response = http.get(url, { tags: { endpoint: 'reservation-availability' } });

  check(response, {
    'availability API returns 200': (res) => res.status === 200,
    'availability response includes slots': (res) => Array.isArray(res.json('data.slots')),
  });
  sleep(pacingSeconds);
}

export function handleSummary(data) {
  const file = __ENV.SUMMARY_FILE || 'summary.json';
  return {
    [file]: JSON.stringify(data, null, 2),
  };
}
