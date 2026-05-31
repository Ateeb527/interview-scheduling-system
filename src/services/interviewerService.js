'use strict';
const { getDb } = require('../database/db');
const { DuplicateEmailError, NotFoundError } = require('../errors');

function createInterviewer({ name, email }) {
  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM interviewers WHERE email = ? COLLATE NOCASE'
  ).get(email);
  if (existing) throw new DuplicateEmailError();

  const result = db.prepare(
    'INSERT INTO interviewers (name, email) VALUES (?, ?)'
  ).run(name, email);

  return { id: Number(result.lastInsertRowid), name, email };
}

function getAllInterviewers() {
  return getDb().prepare('SELECT id, name, email FROM interviewers').all();
}

function getInterviewerById(id) {
  return getDb()
    .prepare('SELECT id, name, email FROM interviewers WHERE id = ?')
    .get(id) || null;
}

module.exports = { createInterviewer, getAllInterviewers, getInterviewerById };
