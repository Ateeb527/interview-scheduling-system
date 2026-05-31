'use strict';

/**
 * Validators return { error: { field, message } } or null.
 * They also return cleaned data so services never touch raw input.
 *
 * Fix #2: trim strings before validation AND return trimmed values.
 * Fix #5: interviewerId coercion — reject strings explicitly.
 */

function validateCreateInterviewer(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  const email = typeof body.email === 'string' ? body.email.trim() : null;

  if (!name) return { error: { field: 'name', message: 'name is required' } };
  if (!email) return { error: { field: 'email', message: 'email is required' } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: { field: 'email', message: 'email must be a valid email address' } };

  return { data: { name, email } };
}

const VALID_STATUSES = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function validateScheduleInterview(body) {
  const candidateName = typeof body.candidateName === 'string'
    ? body.candidateName.trim() : null;

  // Fix #5: explicitly reject non-integer interviewerId (e.g. string "1")
  const interviewerId = body.interviewerId;
  const startTime = body.startTime;
  const endTime = body.endTime;

  if (!candidateName)
    return { error: { field: 'candidateName', message: 'candidateName is required' } };

  if (!Number.isInteger(interviewerId) || interviewerId <= 0)
    return { error: { field: 'interviewerId', message: 'interviewerId must be a positive integer' } };

  if (!startTime || typeof startTime !== 'string' || isNaN(Date.parse(startTime)))
    return { error: { field: 'startTime', message: 'startTime must be a valid ISO 8601 datetime' } };

  if (!endTime || typeof endTime !== 'string' || isNaN(Date.parse(endTime)))
    return { error: { field: 'endTime', message: 'endTime must be a valid ISO 8601 datetime' } };

  // Fix #2: zero-duration interviews rejected (endTime must be strictly after startTime)
  if (new Date(endTime) <= new Date(startTime))
    return { error: { field: 'endTime', message: 'endTime must be strictly after startTime' } };

  return { data: { candidateName, interviewerId, startTime, endTime } };
}

function validateUpdateStatus(body) {
  if (!body.status || !VALID_STATUSES.includes(body.status))
    return {
      error: {
        field: 'status',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      },
    };
  return { data: { status: body.status } };
}

module.exports = {
  validateCreateInterviewer,
  validateScheduleInterview,
  validateUpdateStatus,
  VALID_STATUSES,
};
