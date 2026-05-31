'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

let db;

function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_URL || 'database.sqlite';
    const resolvedPath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);
    db = new DatabaseSync(resolvedPath);

    // Fix #1: enable FK enforcement — without this, invalid interviewerIds
    // are silently inserted. Must be set per-connection in SQLite.
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');

    initSchema(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS interviewers (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL CHECK(length(trim(name)) > 0),
      email TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      candidateName TEXT NOT NULL CHECK(length(trim(candidateName)) > 0),
      interviewerId INTEGER NOT NULL,
      startTime     TEXT NOT NULL,
      endTime       TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'SCHEDULED'
                         CHECK(status IN ('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED')),
      CHECK(endTime > startTime),
      FOREIGN KEY (interviewerId) REFERENCES interviewers(id)
    );
  `);
}

function closeDb() {
  if (db) { db.close(); db = null; }
}

module.exports = { getDb, closeDb };
