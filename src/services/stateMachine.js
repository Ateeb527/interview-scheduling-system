'use strict';

/**
 * Fix #3: State machine is now an explicit module, not an inline object.
 *
 * Rules:
 *  - Same-status transition (e.g. CONFIRMED → CONFIRMED) is explicitly
 *    disallowed — it is not a no-op, it is a mistake.
 *  - COMPLETED and CANCELLED are terminal states — no exits.
 *  - Every valid transition is documented here and testable in isolation.
 */

const TRANSITIONS = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],  // Fix #4: CONFIRMED → CANCELLED is valid
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Returns true if the transition from `from` → `to` is permitted.
 * Same-state transitions always return false (explicit, not accidental).
 */
function isValidTransition(from, to) {
  if (from === to) return false;                      // Fix #3: explicit same-status rejection
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

module.exports = { TRANSITIONS, isValidTransition };
