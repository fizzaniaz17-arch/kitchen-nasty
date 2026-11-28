import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export function generate(spec) {
  const cases = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of ['post', 'patch']) {
      const op = item[method];
      const ref = op?.requestBody?.content?.['application/json']?.schema?.$ref;
      if (!ref) continue;
      const schema = spec.components.schemas[ref.split('/').pop()];
      for (const sample of schema['x-object-samples'] || []) {
        cases.push({ id: `${method}:${path}:body:${sample.name}`, method, path, location: 'body',
          partition: sample.name, value: sample.value, valid: sample.valid, extendValidBody: !!sample.extendValidBody });
      }
      for (const [field, rule] of Object.entries(schema.properties)) {
        const add = (partition, value, valid, omitted = false) => cases.push({ id: `${method}:${path}:${field}:${partition}`, method, path, field, partition, value, valid, omitted });
        if ((schema.required || []).includes(field)) add('missing', null, false, true);
        else add('omitted', null, true, true);
        add('null', null, !!rule.nullable);
        add('wrong-type-array', [], false);
        if (rule.type === 'integer') {
          add('wrong-type', '2', false); add('wrong-type-boolean', true, false); add('wrong-type-object', {}, false); add('fraction', 1.5, false);
          for (const [name, bound] of [['min', rule.minimum], ['max', rule.maximum]]) {
            if (bound === undefined) continue;
            for (const delta of [-1, 0, 1]) {
              const n = bound + delta;
              add(`${name}${delta < 0 ? '-1' : delta > 0 ? '+1' : ''}`, n, (rule.minimum === undefined || n >= rule.minimum) && (rule.maximum === undefined || n <= rule.maximum));
            }
          }
        } else if (rule.type === 'boolean') {
          add('true', true, true); add('false', false, true); add('wrong-type', 'true', false); add('wrong-type-number', 1, false); add('wrong-type-object', {}, false);
        } else if (rule.enum) {
          for (const value of rule.enum) add(`enum-${value}`, value, true);
          add('invalid-enum', 'NOT_A_STATUS', false); add('wrong-type', 7, false); add('wrong-type-boolean', true, false); add('wrong-type-object', {}, false);
        } else {
          add('wrong-type', 7, false); add('wrong-type-boolean', true, false); add('wrong-type-object', {}, false);
          if (rule.minLength !== undefined) {
            for (const delta of [-1, 0, 1]) { const n = rule.minLength + delta; if (n >= 0) add(`minLength${delta < 0 ? '-1' : delta > 0 ? '+1' : ''}`, 'x'.repeat(n), n >= rule.minLength); }
          } else if (rule.pattern) {
            add('pattern-valid', field === 'date' ? '2099-06-15' : '19:00', true);
            add('pattern-invalid', field === 'date' ? 'bad-date' : '9:00', false);
          } else { add('empty', '', true); add('ordinary', 'sample', true); if (field === 'comment') { add('whitespace', '   ', true); add('long', 'x'.repeat(4096), true); } }
        }
        const minimumDays = rule['x-minimum-days-from-today'];
        if (minimumDays !== undefined) {
          for (const offset of [minimumDays - 1, minimumDays, minimumDays + 1]) {
            cases.push({ id: `${method}:${path}:${field}:utc-offset-${offset}`, method, path, field,
              location: 'relative-date', partition: 'utc-day', value: offset, valid: offset >= minimumDays });
          }
        }
        for (const scenario of rule['x-business-scenarios'] || []) {
          cases.push({ id: `${method}:${path}:business:${field}:${scenario.name}`, method, path, location: 'business', field, partition: scenario.name, value: scenario.value, valid: scenario.valid, omitted: false });
        }
      }
    }
  }
  // Query values are strings on the wire. Custom extensions describe controller
  // clamp thresholds or separately identified business boundaries; they do not
  // falsely claim that the implementation rejects outside those bounds.
  const deref = p => p.$ref ? spec.components.parameters[p.$ref.split('/').pop()] : p;
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'patch']) {
      const op = item[method];
      if (!op) continue;
      for (const p of [...(item.parameters || []), ...(op.parameters || [])].map(deref)) {
        const add = (partition, value, omitted = false, isolated = false) => cases.push({ id: `${method}:${path}:${p.in}:${p.name}:${partition}`, method, path, location: p.in, field: p.name, partition, value, omitted, isolated });
        if (p.in === 'header' && p.schema?.type === 'string') {
          const rule = p.schema;
          const pattern = rule.pattern ? new RegExp(rule.pattern) : null;
          const valid = value => (rule.minLength === undefined || value.length >= rule.minLength) &&
            (rule.maxLength === undefined || value.length <= rule.maxLength) && (!pattern || pattern.test(value));
          const addHeader = (partition, value, omitted = false) => cases.push({
            id: `${method}:${path}:header:${p.name}:${partition}`, method, path,
            location: 'header', field: p.name, partition, value, omitted,
            valid: omitted ? !p.required : valid(value),
          });
          const sample = p.example ?? ['Test-42._~', 'A'.repeat(Math.max(1, rule.minLength ?? 1))].find(valid);
          if (sample === undefined || !valid(sample)) throw new Error(`Header ${p.name} needs a schema-valid example`);
          addHeader(p.required ? 'missing' : 'omitted', null, true);
          addHeader('ordinary', sample);
          if (pattern) {
            const invalid = ['bad key', sample + '!', '!', '@', '/'].find(value =>
              (rule.minLength === undefined || value.length >= rule.minLength) &&
              (rule.maxLength === undefined || value.length <= rule.maxLength) && !pattern.test(value));
            if (invalid === undefined) throw new Error(`Header ${p.name} needs an invalid-pattern example`);
            addHeader('invalid-pattern', invalid);
          }
          for (const [name, bound] of [['minLength', rule.minLength], ['maxLength', rule.maxLength]]) {
            if (bound === undefined) continue;
            for (const delta of [-1, 0, 1]) {
              const length = bound + delta;
              if (length < 0) continue;
              addHeader(`${name}${delta < 0 ? '-1' : delta > 0 ? '+1' : ''}`, sample[0].repeat(length));
            }
          }
        } else if (p.in === 'path') {
          add('known', '$known');
          add('unknown', '$unknown');
          for (const [partition, value] of Object.entries(op['x-path-samples']?.[p.name] || {})) add(partition, value);
        } else if (p.in === 'query') {
          add(p.required ? 'missing' : 'omitted', null, true);
          add('empty', '');
          const normal = { locationId: '$locationId', date: '2099-06-15', status: 'PENDING', page: '2', limit: '20', partySize: '2' };
          add('ordinary', p.example ?? normal[p.name] ?? 'sample');
          // Query-string primitives arrive as strings: the literal "null" is
          // a distinct wire value, not a JSON null. Invalid date/status values
          // run in a child because the current Express handlers can reject.
          add('null-literal', 'null', false, ['date', 'status'].includes(p.name));
          if (p.name === 'time') {
            add('free-slot', p['x-free-slot']);
            add('invalid-format', '24:00');
          }
          if (p.name === 'locationId') add('unknown', 'unknown-location');
          if (p.name === 'date') add('invalid-format', 'not-a-date', false, true);
          if (p.name === 'status') {
            for (const status of ['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED']) add(`enum-${status}`, status);
            add('invalid-enum', 'NOT_A_STATUS', false, true);
          }
          for (const bound of p['x-clamp-boundaries'] || p['x-business-boundaries'] || []) {
            for (const delta of [-1, 0, 1]) add(`boundary-${bound}${delta < 0 ? '-1' : delta > 0 ? '+1' : ''}`, String(bound + delta));
          }
          if (['page', 'limit', 'partySize'].includes(p.name)) {
            add('negative', '-1'); add('fraction', '2.5'); add('text', 'abc');
          }
        }
      }
    }
  }
  return cases;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = resolve(process.argv[2] || `${here}/reservations.openapi.json`);
  const output = resolve(process.argv[3] || `${here}/generated/ep-bva-cases.json`);
  const cases = generate(JSON.parse(readFileSync(input, 'utf8')));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(cases, null, 2)}\n`);
  console.log(`Generated ${cases.length} cases from ${input} into ${output}`);
}
