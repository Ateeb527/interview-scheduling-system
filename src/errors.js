'use strict';

/**
 * Fix #7: Typed error classes.
 *
 * Services throw these. The router catches AppError and maps it to HTTP
 * without any per-route if/else chains. Typos on error codes are caught
 * at the throw site, not at the response site.
 */
class AppError extends Error {
  constructor(message, code, httpStatus) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 'NOT_FOUND', 404);
  }
}

class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, code, 409);
  }
}

class DuplicateEmailError extends ConflictError {
  constructor() {
    super('An interviewer with this email already exists.', 'DUPLICATE_EMAIL');
  }
}

class InterviewConflictError extends ConflictError {
  constructor() {
    super('Interviewer already has an interview scheduled during this time.', 'INTERVIEW_CONFLICT');
  }
}

class InvalidStatusTransitionError extends AppError {
  constructor(from, to) {
    super(`Cannot transition from ${from} to ${to}.`, 'INVALID_STATUS_TRANSITION', 422);
    this.from = from;
    this.to = to;
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  DuplicateEmailError,
  InterviewConflictError,
  InvalidStatusTransitionError,
};
