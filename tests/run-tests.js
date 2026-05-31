'use strict';
/**
 * Master test runner.
 * Runs: unit/stateMachine, unit/validators, integration
 * Fix #9: suppress the experimental SQLite warning in test output.
 */
process.env.NODE_NO_WARNINGS = '1';

async function main() {
  console.log('═'.repeat(50));
  console.log('  Interview Scheduling System — Full Test Suite');
  console.log('═'.repeat(50));

  // ── Unit: State Machine ───────────────────────────────────────────────────
  const sm = require('./unit/stateMachine.test');

  // ── Unit: Validators ──────────────────────────────────────────────────────
  const val = require('./unit/validators.test');

  // ── Integration ───────────────────────────────────────────────────────────
  const { run } = require('./integration.test');
  const int = await run();

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalPassed = sm.passed + val.passed + int.passed;
  const totalFailed = sm.failed + val.failed + int.failed;
  const total = totalPassed + totalFailed;

  console.log('\n' + '─'.repeat(50));
  console.log(`  Unit (state machine):  ${sm.passed}/${sm.passed + sm.failed}`);
  console.log(`  Unit (validators):     ${val.passed}/${val.passed + val.failed}`);
  console.log(`  Integration:           ${int.passed}/${int.passed + int.failed}`);
  console.log('─'.repeat(50));
  console.log(`  Total: ${total} tests — ${totalPassed} passed, ${totalFailed} failed`);
  console.log('─'.repeat(50) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

