'use strict';
/**
 * Unit tests for validators — pure functions, zero I/O.
 * Fix #6: validator bugs are caught here before hitting the DB.
 */
const {
  validateCreateInterviewer,
  validateScheduleInterview,
  validateUpdateStatus,
} = require('../../src/validators/schemas');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.log(`  ✗  ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
}

console.log('\nValidators — Unit Tests\n');

// ── createInterviewer ────────────────────────────────────────────────────────
console.log('validateCreateInterviewer');

test('valid input passes and trims', () => {
  const r = validateCreateInterviewer({ name: '  John  ', email: '  john@example.com  ' });
  assert(!r.error);
  assertEqual(r.data.name, 'John');
  assertEqual(r.data.email, 'john@example.com');
});

test('missing name returns VALIDATION_ERROR on field "name"', () => {
  const r = validateCreateInterviewer({ email: 'a@b.com' });
  assert(r.error);
  assertEqual(r.error.field, 'name');
});

test('whitespace-only name is rejected (Fix #2)', () => {
  const r = validateCreateInterviewer({ name: '   ', email: 'a@b.com' });
  assert(r.error);
  assertEqual(r.error.field, 'name');
});

test('missing email returns error on field "email"', () => {
  const r = validateCreateInterviewer({ name: 'Alice' });
  assert(r.error);
  assertEqual(r.error.field, 'email');
});

test('invalid email format is rejected', () => {
  const r = validateCreateInterviewer({ name: 'Alice', email: 'not-an-email' });
  assert(r.error);
  assertEqual(r.error.field, 'email');
});

// ── scheduleInterview ────────────────────────────────────────────────────────
console.log('\nvalidateScheduleInterview');

const validSlot = {
  candidateName: 'Bob',
  interviewerId: 1,
  startTime: '2026-07-01T10:00:00Z',
  endTime:   '2026-07-01T11:00:00Z',
};

test('valid input passes and trims candidateName', () => {
  const r = validateScheduleInterview({ ...validSlot, candidateName: '  Bob  ' });
  assert(!r.error);
  assertEqual(r.data.candidateName, 'Bob');
});

test('whitespace-only candidateName rejected (Fix #2)', () => {
  const r = validateScheduleInterview({ ...validSlot, candidateName: '   ' });
  assert(r.error);
  assertEqual(r.error.field, 'candidateName');
});

test('string interviewerId rejected (Fix #5)', () => {
  const r = validateScheduleInterview({ ...validSlot, interviewerId: '1' });
  assert(r.error);
  assertEqual(r.error.field, 'interviewerId');
});

test('float interviewerId rejected', () => {
  const r = validateScheduleInterview({ ...validSlot, interviewerId: 1.5 });
  assert(r.error);
  assertEqual(r.error.field, 'interviewerId');
});

test('zero interviewerId rejected', () => {
  const r = validateScheduleInterview({ ...validSlot, interviewerId: 0 });
  assert(r.error);
});

test('invalid startTime rejected', () => {
  const r = validateScheduleInterview({ ...validSlot, startTime: 'not-a-date' });
  assert(r.error);
  assertEqual(r.error.field, 'startTime');
});

test('endTime === startTime rejected (zero-duration, Fix #2)', () => {
  const r = validateScheduleInterview({
    ...validSlot,
    startTime: '2026-07-01T10:00:00Z',
    endTime:   '2026-07-01T10:00:00Z',
  });
  assert(r.error);
  assertEqual(r.error.field, 'endTime');
});

test('endTime before startTime rejected', () => {
  const r = validateScheduleInterview({
    ...validSlot,
    startTime: '2026-07-01T11:00:00Z',
    endTime:   '2026-07-01T10:00:00Z',
  });
  assert(r.error);
  assertEqual(r.error.field, 'endTime');
});

// ── updateStatus ─────────────────────────────────────────────────────────────
console.log('\nvalidateUpdateStatus');

test('valid status passes', () => {
  const r = validateUpdateStatus({ status: 'CONFIRMED' });
  assert(!r.error);
  assertEqual(r.data.status, 'CONFIRMED');
});

test('invalid status value rejected', () => {
  const r = validateUpdateStatus({ status: 'NOPE' });
  assert(r.error);
  assertEqual(r.error.field, 'status');
});

test('missing status rejected', () => {
  const r = validateUpdateStatus({});
  assert(r.error);
});

module.exports = { passed, failed };
