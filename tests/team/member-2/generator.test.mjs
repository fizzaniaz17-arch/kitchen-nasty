import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate } from './generate-ep-bva.mjs';

const original = JSON.parse(readFileSync(new URL('./reservations.openapi.json', import.meta.url), 'utf8'));
const select = (cases, path, field, prefix) => cases.filter(c => c.path === path && c.field === field && c.partition.startsWith(prefix)).map(c => c.value);
test('required, enum, and boundary cases follow the specification', () => {
  const cases = generate(original);
  assert.deepEqual(select(cases, '/reservations', 'partySize', 'min'), [0, 1, 2]);
  assert.deepEqual(select(cases, '/reservations', 'partySize', 'max'), [49, 50, 51]);
  assert.ok(cases.some(c => c.field === 'locationId' && c.partition === 'missing' && !c.valid));
  assert.equal(cases.filter(c => !c.location && c.field === 'status' && c.partition.startsWith('enum-')).length, 5);
});
test('two independent constraint changes alter generated triplets without mutating the baseline', () => {
  const changed = structuredClone(original);
  changed.components.schemas.CreateReservation.properties.partySize.maximum = 40;
  changed.components.schemas.CreateTable.properties.capacity.minimum = 2;
  const cases = generate(changed);
  assert.deepEqual(select(cases, '/reservations', 'partySize', 'max'), [39, 40, 41]);
  assert.deepEqual(select(cases, '/locations/{locationId}/tables', 'capacity', 'min'), [1, 2, 3]);
  assert.equal(original.components.schemas.CreateReservation.properties.partySize.maximum, 50);
  assert.equal(original.components.schemas.CreateTable.properties.capacity.minimum, 1);
});
test('generates query clamp triplets and path identifier partitions', () => {
  const cases = generate(original);
  const query = cases.filter(c => c.path === '/reservations' && c.method === 'get' && c.location === 'query' && c.field === 'limit');
  assert.deepEqual(query.filter(c => c.partition.startsWith('boundary-50')).map(c => c.value), ['49', '50', '51']);
  const path = cases.filter(c => c.path === '/reservations/{id}' && c.method === 'get' && c.location === 'path');
  assert.deepEqual(path.map(c => c.partition), ['known', 'unknown', 'encoded-known', 'malformed-escape']);
});
test('generates business clock cases separately from schema pattern validity', () => {
  const cases = generate(original).filter(c => c.location === 'business' && c.path === '/reservations' && c.field === 'time');
  assert.ok(cases.some(c => c.partition === 'clock-max' && c.value === '23:59' && c.valid));
  assert.ok(cases.some(c => c.partition === 'clock-above-max' && c.value === '24:00' && !c.valid));
});

test('relative-day triplets follow the minimum UTC-day offset', () => {
  const changed = structuredClone(original);
  changed.components.schemas.CreateReservation.properties.date['x-minimum-days-from-today'] = 1;
  const days = generate(changed).filter(c => c.location === 'relative-date');
  assert.deepEqual(days.map(c => [c.value, c.valid]), [[0, false], [1, true], [2, true]]);
});
