'use strict';
const { validateCreateInterviewer, validateScheduleInterview, validateUpdateStatus } = require('./validators/schemas');
const { createInterviewer, getAllInterviewers } = require('./services/interviewerService');
const { scheduleInterview, getAllInterviews, updateInterviewStatus } = require('./services/interviewService');
const { AppError } = require('./errors');
const swaggerJson = require('../swagger.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(body, status = 200)  { return { status, body }; }
function created(body)           { return { status: 201, body }; }

/**
 * Fix #8 + #11: Central error mapper.
 * Services throw typed AppError subclasses. One place handles all of them.
 * No per-route if/else chains.
 */
function handleError(err) {
  if (err instanceof AppError) {
    return {
      status: err.httpStatus,
      body: { error: { code: err.code, message: err.message } },
    };
  }
  // Unexpected errors — don't leak internals
  console.error('[UnhandledError]', err);
  return {
    status: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
  };
}

function validationError(field, message) {
  return {
    status: 400,
    body: { error: { code: 'VALIDATION_ERROR', field, message } },
  };
}

// ── Route handlers ───────────────────────────────────────────────────────────

async function router(req) {
  const { method, url, body } = req;
  const parts = url.split('/').filter(Boolean);

  // GET /api-docs
  if (method === 'GET' && url === '/api-docs') return ok(swaggerJson);

  // ── /interviewers ─────────────────────────────────────────────────────────
  if (parts[0] === 'interviewers') {

    if (method === 'POST' && parts.length === 1) {
      const result = validateCreateInterviewer(body);
      if (result.error) return validationError(result.error.field, result.error.message);
      try { return created(createInterviewer(result.data)); }
      catch (e) { return handleError(e); }
    }

    if (method === 'GET' && parts.length === 1) {
      return ok(getAllInterviewers());
    }
  }

  // ── /interviews ───────────────────────────────────────────────────────────
  if (parts[0] === 'interviews') {

    if (method === 'POST' && parts.length === 1) {
      const result = validateScheduleInterview(body);
      if (result.error) return validationError(result.error.field, result.error.message);
      try { scheduleInterview(result.data); return created({ message: 'Interview scheduled successfully' }); }
      catch (e) { return handleError(e); }
    }

    if (method === 'GET' && parts.length === 1) {
      return ok(getAllInterviews());
    }

    if (method === 'PATCH' && parts.length === 3 && parts[2] === 'status') {
      const id = parseInt(parts[1], 10);
      if (isNaN(id)) return validationError('id', 'id must be an integer');

      const result = validateUpdateStatus(body);
      if (result.error) return validationError(result.error.field, result.error.message);
      try { updateInterviewStatus(id, result.data.status); return ok({ message: 'Interview status updated successfully' }); }
      catch (e) { return handleError(e); }
    }
  }

  return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Route not found.' } } };
}

module.exports = { router };
