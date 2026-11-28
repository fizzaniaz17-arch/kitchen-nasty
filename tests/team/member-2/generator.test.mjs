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


test('header string cases follow schema length and pattern constraints', () => {
  const header = cases => cases.filter(c => c.location === 'header' && c.field === 'Idempotency-Key');
  const cases = header(generate(original));
  assert.deepEqual(cases.map(c => c.partition), ['omitted', 'ordinary', 'invalid-pattern',
    'minLength-1', 'minLength', 'minLength+1', 'maxLength-1', 'maxLength', 'maxLength+1']);
  assert.deepEqual(cases.slice(3).map(c => [c.value.length, c.valid]),
    [[0, false], [1, true], [2, true], [127, true], [128, true], [129, false]]);
  assert.equal(cases[1].value, 'Test-42._~');
  assert.equal(cases[0].omitted, true);
  assert.equal(cases[0].valid, true);
  assert.equal(cases[3].omitted, false);
  assert.equal(cases[3].value, '');
  assert.equal(cases[2].valid, false);
  const changed = structuredClone(original);
  const rule = changed.paths['/reservations'].post.parameters.find(p => p.name === 'Idempotency-Key').schema;
  rule.minLength = 2;
  rule.maxLength = 4;
  const modified = header(generate(changed));
  assert.deepEqual(modified.slice(3).map(c => c.value.length), [1, 2, 3, 3, 4, 5]);
  rule.minLength = 1;
  rule.maxLength = 128;
  rule.pattern = '^[A-Z0-9]+$';
  const patternCases = header(generate(changed));
  assert.equal(patternCases.find(c => c.partition === 'ordinary').value, 'A');
  assert.equal(patternCases.find(c => c.partition === 'invalid-pattern').valid, false);
});

test('generated case IDs are unique, deterministic, and preserve non-header cases', () => {
  const cases = generate(original);
  assert.deepEqual(generate(original), cases);
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  const withoutHeaders = structuredClone(original);
  withoutHeaders.paths['/reservations'].post.parameters = [];
  assert.deepEqual(cases.filter(c => c.location !== 'header'), generate(withoutHeaders));
});
