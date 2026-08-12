# Review Ledger — refactor-atomic-transactions

Pre-commit review (fresh context, parallel lenses: review-reliability R3, review-resilience R4).
Branch: `refactor-atomic-transactions`. Artifact store: hybrid.

## Findings

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| R4-001 | resilience | src/controllers/webhooks/MercadoPagoWebhookController.ts:47-52 + src/services/webhooks/MercadoPagoWebhookService.ts:79-87 | CRITICAL | wont-fix | Webhook ack 200 before async processing; a failed transaction now rolls back both order+appointment with no retry/outbox/reconciliation (grep: no cron/outbox/retry). Accepted by design: outbox is milestone 3.2 (user decision); the change is strictly better than the old inconsistent partial-commit state. Not a regression introduced here beyond the accepted atomicity tradeoff. |
| R4-003 | resilience | src/config/db.ts transaction() finally | WARNING | fixed | ROLLBACK failure returned client to pool without release(err) → connection with open tx could corrupt the next unit of work. Fix: capture rollbackError and pass `client.release(rollbackError)` to DESTROY the client. Test added: db.test.ts "destroys the client when ROLLBACK itself fails". |
| R4-002 | resilience | src/services/AppointmentService.ts:497-517 | WARNING | wont-fix | Provider failure after local COMMIT leaves orphaned pending order with stable reference; retry creates duplicate MP preference (no idempotency key). Accepted by design: idempotency/outbox deferred to milestone 3.2. |
| R4-004 | resilience | src/repositories/BaseRepository.ts (all catch blocks) | WARNING | wont-fix | Repo methods mask original errors as generic "Error de base de datos", making webhook money-state failures undiagnosable. Pre-existing pattern, out of scope for this change. |
| R4-005 | resilience | src/config/db.ts:12-15,25-26 | SUGGESTION | wont-fix | Pool has no connectionTimeoutMillis/statement_timeout; fire-and-forget webhook could accumulate pending promises on DB stall. Design risk, not measured regression. |
| R3-001 | reliability | test/integration/transaction/atomicity.int.test.ts:41-64 | WARNING | fixed | rejects.toThrow() matched ANY error → test passed vacuously if the FIRST insert failed. Fix: assert pg error code 23505 (unique violation) which can only come from the second in-tx insert colliding with the first. |
| R3-002 | reliability | src/services/AppointmentService.ts updateAppointment db short-circuit | WARNING | wont-fix | Passing db silently toggles 3 behaviors (skip emails, skip enrichment, different return shape). Emails are a no-op stub today; the webhook ignores the return value. Documented in code comment; accepted for now, revisit when mailer lands. |
| R3-003 | reliability | src/config/db.ts transaction() + test pool max:1 | WARNING | wont-fix | No acquire timeout; any stray dbClient.query inside work() would hang forever (deadlock canary never fires in unit tests since connect is mocked). Service-level tx flows not exercised against real DB locally. Mitigated by test:int in CI. |
| R3-004 | reliability | jest.config.js | SUGGESTION | wont-fix | No forbidOnly: true in jest config (no CI workflow exists). Pre-existing; no .only present in new tests (verified). |
| R3-005 | reliability | src/services/AppointmentService.ts provider call after commit | SUGGESTION | wont-fix | No test pins post-commit provider-failure state (orphan pending order with stable reference). Relevant to future outbox work. |
| R3-006 | reliability | src/config/db.ts transaction() | SUGGESTION | wont-fix | No nested-transaction guard (would BEGIN on a second client instead of savepoint). Comment documents contract; enforcement absent. |
| R3-007 | reliability | package.json / test/integration/transaction/atomicity.int.test.ts | SUGGESTION | wont-fix | New *.int.test.ts adds a second DB-dependent suite to plain `npm test` (pre-existing convention). A dedicated test:unit script would clarify the deterministic unit gate. |
| R3-008 | reliability | src/config/db.ts EOF | SUGGESTION | fixed | Trailing newline added. |

## Resolution summary

- Fixed: R4-003 (client.release(rollbackError)), R3-001 (assert 23505), R3-008 (newline).
- Accepted (design-deferred): R4-001, R4-002 (outbox/idempotency → milestone 3.2).
- Accepted (pre-existing / out of scope): R4-004, R4-005, R3-002, R3-003, R3-004, R3-005, R3-006, R3-007.
- Re-verification after fixes: `npm run typecheck` clean; `NODE_ENV=test npx jest test/unit` → 24 passed, 4 skipped, 0 failed.
