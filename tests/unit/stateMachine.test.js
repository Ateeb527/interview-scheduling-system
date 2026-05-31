'use strict';
/**
 * Unit tests for the state machine — pure logic, zero I/O.
 * Fix #6: these catch transition bugs without any HTTP or DB setup.
 */
const { isValidTransition, TRANSITIONS } = require('../../src/services/stateMachine');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.log(`  ✗  ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'failed'); }

console.log('\nState Machine — Unit Tests\n');

// Valid forward transitions
test('SCHEDULED → CONFIRMED is valid', () => assert(isValidTransition('SCHEDULED', 'CONFIRMED')));
test('SCHEDULED → CANCELLED is valid', () => assert(isValidTransition('SCHEDULED', 'CANCELLED')));
test('CONFIRMED → COMPLETED is valid', () => assert(isValidTransition('CONFIRMED', 'COMPLETED')));
test('CONFIRMED → CANCELLED is valid', () => assert(isValidTransition('CONFIRMED', 'CANCELLED'))); // Fix #4

// Invalid / terminal transitions
test('COMPLETED → SCHEDULED is invalid',  () => assert(!isValidTransition('COMPLETED', 'SCHEDULED')));
test('COMPLETED → CANCELLED is invalid',  () => assert(!isValidTransition('COMPLETED', 'CANCELLED')));
test('COMPLETED → CONFIRMED is invalid',  () => assert(!isValidTransition('COMPLETED', 'CONFIRMED')));
test('CANCELLED → CONFIRMED is invalid',  () => assert(!isValidTransition('CANCELLED', 'CONFIRMED')));
test('CANCELLED → SCHEDULED is invalid',  () => assert(!isValidTransition('CANCELLED', 'SCHEDULED')));

// Fix #3: same-status transitions — explicitly rejected, not a no-op
test('SCHEDULED → SCHEDULED is invalid (same-status)', () => assert(!isValidTransition('SCHEDULED', 'SCHEDULED')));
test('CONFIRMED → CONFIRMED is invalid (same-status)', () => assert(!isValidTransition('CONFIRMED', 'CONFIRMED')));
test('COMPLETED → COMPLETED is invalid (same-status)', () => assert(!isValidTransition('COMPLETED', 'COMPLETED')));
test('CANCELLED → CANCELLED is invalid (same-status)',  () => assert(!isValidTransition('CANCELLED', 'CANCELLED')));

// Structural: all defined statuses have a transitions entry
test('All statuses have a TRANSITIONS entry', () => {
  ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].forEach(s =>
    assert(Array.isArray(TRANSITIONS[s]), `Missing entry for ${s}`)
  );
});

module.exports = { passed, failed };
