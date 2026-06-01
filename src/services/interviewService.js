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
    SELECT i.id
    FROM interviews i
    JOIN interview_interviewers ii
      ON ii.interviewId = i.id
    WHERE ii.interviewerId = ?
      AND i.status NOT IN ('CANCELLED')
      AND i.startTime < ?
      AND i.endTime > ?
  `;

  const params = [interviewerId, endTime, startTime];

  if (excludeId !== null) {
    sql += ' AND i.id != ?';
    params.push(excludeId);
  }

  return !!db.prepare(sql).get(...params);
}

function scheduleInterview({ candidateName, interviewerIds, startTime, endTime }) {
  // Validator already trimmed candidateName — store it clean
  for (const interviewerId of interviewerIds) {
  if (!getInterviewerById(interviewerId)) {
   throw new NotFoundError(
  `Interviewer with id ${interviewerId} not found.`
);
  }
}

 for (const interviewerId of interviewerIds) {
  if (hasConflict(interviewerId, startTime, endTime)) {
    throw new InterviewConflictError();
  }
}
 const result = getDb().prepare(`
  INSERT INTO interviews
  (candidateName, startTime, endTime, status)
  VALUES (?, ?, ?, 'SCHEDULED')
`).run(
  candidateName,
  startTime,
  endTime
);

const interviewId = result.lastInsertRowid;

const stmt = getDb().prepare(`
  INSERT INTO interview_interviewers
  (interviewId, interviewerId)
  VALUES (?, ?)
`);

for (const interviewerId of interviewerIds) {
  stmt.run(interviewId, interviewerId);
}
}

function getAllInterviews() {
  const interviews = getDb()
    .prepare('SELECT * FROM interviews')
    .all();

  return interviews.map(interview => {
    const interviewerIds = getDb()
      .prepare(`
        SELECT interviewerId
        FROM interview_interviewers
        WHERE interviewId = ?
      `)
      .all(interview.id)
      .map(row => row.interviewerId);

    return {
      ...interview,
      interviewerIds
    };
  });
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
