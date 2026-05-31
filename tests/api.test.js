const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Use an in-memory / temp DB for tests
process.env.DATABASE_URL = path.join(__dirname, 'test.sqlite');

const app = require('../src/app');
const { closeDb } = require('../src/database/db');

afterAll(() => {
  closeDb();
  const dbPath = path.join(__dirname, 'test.sqlite');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

// ─── Interviewers ─────────────────────────────────────────────────────────────

describe('POST /interviewers', () => {
  test('creates an interviewer successfully', async () => {
    const res = await request(app)
      .post('/interviewers')
      .send({ name: 'John Doe', email: 'john@example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'John Doe', email: 'john@example.com' });
    expect(res.body.id).toBeDefined();
  });

  test('rejects missing name', async () => {
    const res = await request(app)
      .post('/interviewers')
      .send({ email: 'no-name@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/interviewers')
      .send({ name: 'Bob', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/interviewers')
      .send({ name: 'John Duplicate', email: 'john@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('GET /interviewers', () => {
  test('returns list of interviewers', async () => {
    const res = await request(app).get('/interviewers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── Interviews ───────────────────────────────────────────────────────────────

let interviewerId;
let interviewId;

beforeAll(async () => {
  const res = await request(app)
    .post('/interviewers')
    .send({ name: 'Alice Interviewer', email: 'alice.interviewer@example.com' });
  interviewerId = res.body.id;
});

describe('POST /interviews', () => {
  test('schedules an interview successfully', async () => {
    const res = await request(app).post('/interviews').send({
      candidateName: 'Bob Candidate',
      interviewerId,
      startTime: '2026-07-01T10:00:00Z',
      endTime: '2026-07-01T11:00:00Z',
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Interview scheduled successfully');
  });

  test('detects scheduling conflict (overlapping)', async () => {
    const res = await request(app).post('/interviews').send({
      candidateName: 'Carol Candidate',
      interviewerId,
      startTime: '2026-07-01T10:30:00Z',
      endTime: '2026-07-01T11:30:00Z',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INTERVIEW_CONFLICT');
  });

  test('allows non-overlapping interview for same interviewer', async () => {
    const res = await request(app).post('/interviews').send({
      candidateName: 'Dave Candidate',
      interviewerId,
      startTime: '2026-07-01T11:00:00Z',
      endTime: '2026-07-01T12:00:00Z',
    });
    expect(res.status).toBe(201);
  });

  test('rejects missing candidateName', async () => {
    const res = await request(app).post('/interviews').send({
      interviewerId,
      startTime: '2026-07-02T10:00:00Z',
      endTime: '2026-07-02T11:00:00Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects endTime before startTime', async () => {
    const res = await request(app).post('/interviews').send({
      candidateName: 'Eve Candidate',
      interviewerId,
      startTime: '2026-07-02T11:00:00Z',
      endTime: '2026-07-02T10:00:00Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects non-existent interviewerId', async () => {
    const res = await request(app).post('/interviews').send({
      candidateName: 'Frank Candidate',
      interviewerId: 99999,
      startTime: '2026-07-03T10:00:00Z',
      endTime: '2026-07-03T11:00:00Z',
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /interviews', () => {
  test('returns list of interviews', async () => {
    const res = await request(app).get('/interviews');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    interviewId = res.body[0]?.id;
  });
});

describe('PATCH /interviews/:id/status', () => {
  test('transitions SCHEDULED → CONFIRMED', async () => {
    const res = await request(app)
      .patch(`/interviews/${interviewId}/status`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Interview status updated successfully');
  });

  test('transitions CONFIRMED → COMPLETED', async () => {
    const res = await request(app)
      .patch(`/interviews/${interviewId}/status`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);
  });

  test('rejects COMPLETED → SCHEDULED (invalid transition)', async () => {
    const res = await request(app)
      .patch(`/interviews/${interviewId}/status`)
      .send({ status: 'SCHEDULED' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('rejects COMPLETED → CANCELLED (invalid transition)', async () => {
    const res = await request(app)
      .patch(`/interviews/${interviewId}/status`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  test('rejects invalid status value', async () => {
    const res = await request(app)
      .patch(`/interviews/${interviewId}/status`)
      .send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('returns 404 for non-existent interview', async () => {
    const res = await request(app)
      .patch('/interviews/99999/status')
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(404);
  });

  test('SCHEDULED → CANCELLED is valid', async () => {
    // Schedule a new interview to test cancellation
    const newInterview = await request(app).post('/interviews').send({
      candidateName: 'Cancel Test',
      interviewerId,
      startTime: '2026-08-01T10:00:00Z',
      endTime: '2026-08-01T11:00:00Z',
    });
    expect(newInterview.status).toBe(201);

    const interviews = await request(app).get('/interviews');
    const cancellable = interviews.body.find(
      (i) => i.candidateName === 'Cancel Test'
    );

    const res = await request(app)
      .patch(`/interviews/${cancellable.id}/status`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(200);
  });
});
