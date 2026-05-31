'use strict';

const path = require('node:path');
const fs = require('node:fs');

// Windows/Linux compatible test database
process.env.DATABASE_URL = path.join(
  __dirname,
  'interview-integration.sqlite'
);

require('../src/env');

const { router } = require('../src/router');
const { closeDb } = require('../src/database/db');

async function req(method, url, body = {}) {
  return router({ method, url, body });
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e) { console.log(`  ✗  ${name}: ${e.message}`); failed++; }
}
function assert(c, m) { if (!c) throw new Error(m || 'failed'); }
function assertEqual(a, b, m) {
  if (a !== b) throw new Error(m || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
}

async function main() {
  let interviewerId, interviewId;

  console.log('\nIntegration Tests\n');

  // ── Interviewers ──────────────────────────────────────────────────────────
  console.log('Interviewers');

  await test('POST — creates successfully', async () => {
    const r = await req('POST', '/interviewers', { name: 'John Doe', email: 'john@example.com' });
    assertEqual(r.status, 201);
    assert(r.body.id);
    interviewerId = r.body.id;
  });

  await test('POST — trims whitespace from name and email', async () => {
    const r = await req('POST', '/interviewers', { name: '  Jane  ', email: '  jane@example.com  ' });
    assertEqual(r.status, 201);
    assertEqual(r.body.name, 'Jane');
    assertEqual(r.body.email, 'jane@example.com');
  });

  await test('POST — rejects missing name', async () => {
    const r = await req('POST', '/interviewers', { email: 'x@x.com' });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.code, 'VALIDATION_ERROR');
    assertEqual(r.body.error.field, 'name');
  });

  await test('POST — rejects whitespace-only name (Fix #2)', async () => {
    const r = await req('POST', '/interviewers', { name: '   ', email: 'ws@example.com' });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.code, 'VALIDATION_ERROR');
  });

  await test('POST — rejects invalid email', async () => {
    const r = await req('POST', '/interviewers', { name: 'Bob', email: 'not-email' });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.field, 'email');
  });

  await test('POST — rejects duplicate email with 409', async () => {
    const r = await req('POST', '/interviewers', { name: 'John 2', email: 'john@example.com' });
    assertEqual(r.status, 409);
    assertEqual(r.body.error.code, 'DUPLICATE_EMAIL');
  });

  await test('GET — returns array with created interviewers', async () => {
    const r = await req('GET', '/interviewers');
    assertEqual(r.status, 200);
    assert(Array.isArray(r.body) && r.body.length >= 1);
  });

  // ── Interviews ────────────────────────────────────────────────────────────
  console.log('\nInterviews');

  await test('POST — schedules successfully', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Alice Smith', interviewerId,
      startTime: '2026-07-01T10:00:00Z', endTime: '2026-07-01T11:00:00Z',
    });
    assertEqual(r.status, 201);
  });

  await test('POST — detects full overlap', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Bob', interviewerId,
      startTime: '2026-07-01T10:30:00Z', endTime: '2026-07-01T11:30:00Z',
    });
    assertEqual(r.status, 409);
    assertEqual(r.body.error.code, 'INTERVIEW_CONFLICT');
  });

  // Fix #5: boundary — touching slots must NOT conflict
  await test('POST — touching boundary slots are NOT a conflict (Fix #5)', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Carol', interviewerId,
      startTime: '2026-07-01T11:00:00Z', endTime: '2026-07-01T12:00:00Z',
    });
    assertEqual(r.status, 201);
  });

  await test('POST — rejects missing candidateName', async () => {
    const r = await req('POST', '/interviews', {
      interviewerId, startTime: '2026-07-02T10:00:00Z', endTime: '2026-07-02T11:00:00Z',
    });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.field, 'candidateName');
  });

  await test('POST — rejects whitespace-only candidateName (Fix #2)', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: '   ', interviewerId,
      startTime: '2026-07-03T10:00:00Z', endTime: '2026-07-03T11:00:00Z',
    });
    assertEqual(r.status, 400);
  });

  await test('POST — rejects string interviewerId (Fix #5)', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Dave', interviewerId: '1',
      startTime: '2026-07-04T10:00:00Z', endTime: '2026-07-04T11:00:00Z',
    });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.field, 'interviewerId');
  });

  await test('POST — rejects endTime === startTime (zero-duration)', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Eve', interviewerId,
      startTime: '2026-07-05T10:00:00Z', endTime: '2026-07-05T10:00:00Z',
    });
    assertEqual(r.status, 400);
  });

  await test('POST — rejects endTime before startTime', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Frank', interviewerId,
      startTime: '2026-07-06T11:00:00Z', endTime: '2026-07-06T10:00:00Z',
    });
    assertEqual(r.status, 400);
  });

  await test('POST — rejects non-existent interviewerId', async () => {
    const r = await req('POST', '/interviews', {
      candidateName: 'Ghost', interviewerId: 99999,
      startTime: '2026-07-07T10:00:00Z', endTime: '2026-07-07T11:00:00Z',
    });
    assertEqual(r.status, 404);
  });

  await test('GET — returns array', async () => {
    const r = await req('GET', '/interviews');
    assertEqual(r.status, 200);
    assert(Array.isArray(r.body) && r.body.length >= 1);
    interviewId = r.body[0].id;
  });

  // ── Status transitions ────────────────────────────────────────────────────
  console.log('\nStatus Transitions');

  await test('SCHEDULED → CONFIRMED (valid)', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'CONFIRMED' });
    assertEqual(r.status, 200);
  });

  // Fix #3: same-status must be explicitly rejected
  await test('CONFIRMED → CONFIRMED is rejected (Fix #3)', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'CONFIRMED' });
    assertEqual(r.status, 422);
    assertEqual(r.body.error.code, 'INVALID_STATUS_TRANSITION');
  });

  await test('CONFIRMED → COMPLETED (valid)', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'COMPLETED' });
    assertEqual(r.status, 200);
  });

  await test('COMPLETED → SCHEDULED is invalid', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'SCHEDULED' });
    assertEqual(r.status, 422);
    assertEqual(r.body.error.code, 'INVALID_STATUS_TRANSITION');
  });

  await test('COMPLETED → CANCELLED is invalid', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'CANCELLED' });
    assertEqual(r.status, 422);
  });

  await test('SCHEDULED → CANCELLED (valid)', async () => {
    const s = await req('POST', '/interviews', {
      candidateName: 'Cancel Test', interviewerId,
      startTime: '2026-08-01T10:00:00Z', endTime: '2026-08-01T11:00:00Z',
    });
    assertEqual(s.status, 201);
    const list = await req('GET', '/interviews');
    const t = list.body.find(i => i.candidateName === 'Cancel Test');
    const r = await req('PATCH', `/interviews/${t.id}/status`, { status: 'CANCELLED' });
    assertEqual(r.status, 200);
  });

  // Fix #4: CONFIRMED → CANCELLED was untested
  await test('CONFIRMED → CANCELLED (valid, Fix #4)', async () => {
    const s = await req('POST', '/interviews', {
      candidateName: 'Confirm Cancel Test', interviewerId,
      startTime: '2026-09-01T10:00:00Z', endTime: '2026-09-01T11:00:00Z',
    });
    assertEqual(s.status, 201);
    const list = await req('GET', '/interviews');
    const t = list.body.find(i => i.candidateName === 'Confirm Cancel Test');
    await req('PATCH', `/interviews/${t.id}/status`, { status: 'CONFIRMED' });
    const r = await req('PATCH', `/interviews/${t.id}/status`, { status: 'CANCELLED' });
    assertEqual(r.status, 200);
  });

  await test('PATCH — rejects invalid status value', async () => {
    const r = await req('PATCH', `/interviews/${interviewId}/status`, { status: 'NOPE' });
    assertEqual(r.status, 400);
    assertEqual(r.body.error.code, 'VALIDATION_ERROR');
  });

  await test('PATCH — 404 for non-existent interview', async () => {
    const r = await req('PATCH', '/interviews/99999/status', { status: 'CONFIRMED' });
    assertEqual(r.status, 404);
  });

  await test('PATCH — non-integer id returns 400', async () => {
    const r = await req('PATCH', '/interviews/abc/status', { status: 'CONFIRMED' });
    assertEqual(r.status, 400);
  });

  // ── Cancelled slot is reschedulable ───────────────────────────────────────
  console.log('\nCancelled slot rescheduling');

  await test('Cancelled interview frees up the slot', async () => {
    // Schedule, cancel, then book same slot again — should succeed
    const slot = {
      candidateName: 'Slot Tester', interviewerId,
      startTime: '2026-10-01T10:00:00Z', endTime: '2026-10-01T11:00:00Z',
    };
    const s1 = await req('POST', '/interviews', slot);
    assertEqual(s1.status, 201);
    const list = await req('GET', '/interviews');
    const t = list.body.find(i => i.candidateName === 'Slot Tester');
    await req('PATCH', `/interviews/${t.id}/status`, { status: 'CANCELLED' });
    const s2 = await req('POST', '/interviews', { ...slot, candidateName: 'Rebooker' });
    assertEqual(s2.status, 201);
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  closeDb();

  if (fs.existsSync(process.env.DATABASE_URL)) {
    fs.unlinkSync(process.env.DATABASE_URL);
  }

  return { passed, failed };
}
module.exports = { run: main };