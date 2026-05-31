'use strict';
const { getDb } = require('../database/db');
const { getInterviewerById } = require('./interviewerService');
const { isValidTransition } = require('./stateMachine');
const {
  NotFoundError,
  InterviewConflictError,
  InvalidStatusTransitionError,
} = require('../errors');

/**
 * Fix #5 (boundary time): uses strict < and > so that touching boundaries
 * (e.g. 10:00–11:00 and 11:00–12:00) are NOT considered conflicts.
 *
 * The SQL reads: existing interview overlaps the requested slot when
 *   existing.startTime < requested.endTime   (existing starts before new ends)
 *   AND
 *   existing.endTime > requested.startTime   (existing ends after new starts)
 *
 * Cancelled interviews are excluded — they free up the slot.
 */
function hasConflict(interviewerId, startTime, endTime, excludeId = null) {
  const db = getDb();
  let sql = `
    SELECT id FROM interviews
    WHERE interviewerId = ?
      AND status NOT IN ('CANCELLED')
      AND startTime < ?
      AND endTime   > ?
  `;
  const params = [interviewerId, endTime, startTime];

  if (excludeId !== null) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  return !!db.prepare(sql).get(...params);
}

function scheduleInterview({ candidateName, interviewerId, startTime, endTime }) {
  // Validator already trimmed candidateName — store it clean
  if (!getInterviewerById(interviewerId))
    throw new NotFoundError(`Interviewer with id ${interviewerId} not found.`);

  if (hasConflict(interviewerId, startTime, endTime))
    throw new InterviewConflictError();

  getDb().prepare(`
    INSERT INTO interviews (candidateName, interviewerId, startTime, endTime, status)
    VALUES (?, ?, ?, ?, 'SCHEDULED')
  `).run(candidateName, interviewerId, startTime, endTime);
}

function getAllInterviews() {
  return getDb().prepare('SELECT * FROM interviews').all();
}

function getInterviewById(id) {
  return getDb().prepare('SELECT * FROM interviews WHERE id = ?').get(id) || null;
}

function updateInterviewStatus(id, newStatus) {
  const interview = getInterviewById(id);
  if (!interview) throw new NotFoundError(`Interview with id ${id} not found.`);

  // Fix #3: isValidTransition rejects same-status explicitly
  if (!isValidTransition(interview.status, newStatus))
    throw new InvalidStatusTransitionError(interview.status, newStatus);

  getDb()
    .prepare('UPDATE interviews SET status = ? WHERE id = ?')
    .run(newStatus, id);
}

module.exports = {
  scheduleInterview,
  getAllInterviews,
  getInterviewById,
  updateInterviewStatus,
  hasConflict, // exported for unit testing
};
