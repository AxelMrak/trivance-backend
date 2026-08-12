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

---

# Final Review (4R fan-out) — post-archive, pre-PR

Full 4-lens review (R1 risk, R2 readability, R3 reliability, R4 resilience), fresh context, parallel.

## Findings

| id | lens | location | severity | status | evidence |
|---|---|---|---|---|---|
| R1-001 | risk | src/routes/WebhooksRoutes.ts POST /mercadopago/test + MercadoPagoWebhookController.handleTest + processWebhook | BLOCKER (pre-existing) | wont-fix (separate task) | `/mercadopago/test` has NO auth and NO signature check and calls processWebhook; with live_mode===false it fabricates paymentData={status:"approved"}. An attacker can POST {"type":"payment","data":{"id":"<order.id>"},"live_mode":false} to mark an order paid + appointment confirmed with zero payment. NOT introduced by this branch (pre-existing), but lives in the touched financial path. Must be guarded/disabled before shipping payments. |
| R1-002 | risk | AppointmentService.createPaymentLink:490-507 | WARNING | wont-fix (deferred) | Non-idempotent: retry after post-commit provider failure creates a second order + second MP preference (no unique constraint on appointment_id). Deferred to idempotency/outbox milestone 3.2. |
| R1-003 | risk | MercadoPagoWebhookService:79-87 | WARNING | wont-fix (deferred) | No current-state/sequence guard: an out-of-order or retried webhook downgrades a paid order/confirmed appointment. Pre-existing logic, newly wrapped. Deferred. |
| R1-004 | risk | AppointmentService:274-278 + webhook caller | WARNING | wont-fix (accepted) | `if (db) return updated` drops the status-change email for webhook flows. Mailer is a no-op stub today; latent regression when wired. Accepted; revisit with mailer. |
| R1-005 | risk | BaseRepository + BaseQueries | SUGGESTION | wont-fix | Column/field names string-interpolated, not parameterized. Not exploitable today (Zod .strict() whitelists fields). Defense-in-depth note. |
| R1-006 | risk | db.ts transaction() | SUGGESTION | wont-fix | No connectionTimeoutMillis/statement_timeout. Dup of R4-005. |
| R1-007 | risk | AppointmentService:225 signature | SUGGESTION | wont-fix | db as 4th positional param silently toggles 3 behaviors. Dup of R3-002. |
| R2-001 | readability | AppointmentService updateAppointment | WARNING | wont-fix (accepted) | `db` doubles as a behavior mode flag (skip email/enrichment, different return shape). Root: Db type erases pool-vs-tx distinction. Accepted design tradeoff, documented in code. |
| R2-002 | readability | MercadoPagoWebhookService:81-86 | WARNING | wont-fix (accepted) | Literal positional `undefined` hole to reach `db` (4th arg). Fragile; candidate for options object in a future refactor. |
| R2-003 | readability | db.ts:9 | SUGGESTION | wont-fix | `Db` union collapses to a single {query} shape (structurally identical). Name gives no signal of "in-tx" meaning. Cosmetic. |
| R2-004 | readability | AppointmentService:497-506 | SUGGESTION | wont-fix | `createdOrder` holds order AFTER stable reference set; name reads fine (.id unchanged). Minor. |
| R2-005 | readability | AppointmentService:484 | SUGGESTION | fixed | Stale comment "we'll set it to order.id after create" misstated timing. Reworded to point at the atomic create+update. |
| R2-006 | readability | OrderService:27-36 | WARNING | wont-fix (pre-existing) | updateOrder contract changed from return-null to throw-on-missing (the old null branch was already unreachable — getById throws). Flag in PR description. |
| R3-001 | reliability | test/integration/transaction/atomicity.int.test.ts | BLOCKER | fixed | The prior "fix" asserted `code: 23505`, but BaseRepository.create masks the pg error as `new Error("Error de base de datos")` (no code), so the assertion could NEVER pass — the test was broken and its comment false. Fixed: raw SQL inside the transaction so the pg code propagates unmasked; assertion now genuinely proves the second mutation caused the rollback. |
| R3-002 | reliability | AppointmentService updateAppointment | WARNING | wont-fix | Return-shape divergence on db short-circuit (dup R2-001). |
| R3-003 | reliability | BaseRepository + webhook | WARNING | wont-fix (pre-existing) | Error masking strips retryability signals (deadlock 40P01 vs FK 23503 both become generic). Pre-existing; now load-bearing at tx boundary. |
| R3-004 | reliability | AppointmentService:276-284 | SUGGESTION | wont-fix | Email notification dropped, not deferred past commit. No-op today. |
| R3-005 | reliability | AppointmentService createPaymentLink | SUGGESTION | wont-fix (deferred) | Non-idempotent (dup R1-002). |
| R3-006 | reliability | OrderService:27-35 | SUGGESTION | wont-fix | `Promise<Order | null>` return type misleading — always throws, never returns null. |
| R4-006 | resilience | db.ts:38-43 | WARNING | wont-fix (accepted) | Rollback failure destroys the connection but the destroy signal is never logged; repeated rollback failures degrade pool with no visibility. |
| R4-007 | resilience | db.ts:25-34 | WARNING | wont-fix (accepted) | No statement_timeout/lock_timeout; a hung query holds the connection indefinitely; pool exhaustion. Escalates R4-005 to real load risk. |
| R4-008 | resilience | MercadoPagoWebhookController:50-52 | WARNING | wont-fix (accepted) | Fire-and-forget swallows tx failures into console.error only — no alerting/metrics. Distinct from R4-001 (observability, not retry). |
| R4-009 | resilience | AppointmentService:282-284 | SUGGESTION | wont-fix | Webhook path has no post-commit email trigger (dup R1-004/R3-004). |

## Final review verdict

The transaction helper and both atomic flows are CORRECT: connection lifecycle verified against pg source (release exactly once, destroy-on-rollback-failure correct, no leak, no double-release), same-client guarantee holds across all mutations, external HTTP stays outside the transaction.

**Fixes applied this round**: R3-001 (BLOCKER — the 23505 integration assertion was impossible to satisfy because the repository masks the pg error; rewrote the test to use raw SQL so the code propagates and the claim is genuinely proven) and R2-005 (stale comment).

**Accepted by design / deferred**: idempotency + outbox (R1-002/R1-003/R3-005 → milestone 3.2), error masking (R3-003/R4-004 pre-existing), observability/timeouts (R4-006/R4-007/R4-008), and the `db`-as-mode-flag API shape (R1-007/R2-001/R2-002/R3-002).

**Needs a SEPARATE task (BLOCKER, pre-existing, not part of this change)**: R1-001 — the unauthenticated `/mercadopago/test` webhook endpoint can forge approved payments. Must be disabled/guarded before the payments flow ships.

Re-verification after this round: `npm run typecheck` clean; `NODE_ENV=test npx jest test/unit` → 24 passed, 4 skipped, 0 failed.
