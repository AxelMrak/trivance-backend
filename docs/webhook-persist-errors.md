# Webhook Persistence Error Handling — Tracking

This branch tracks the pending `TODO(jrz-errors)` items in the MercadoPago
webhook flow. They wait for the merge of PR #77
(`refactor: centralize database error handling`, head `fix/error-propagation`),
which introduces `src/errors/persistenceErrors.ts` mapping SQLSTATE codes to
typed errors (`ConflictError` with `code: "UNIQUE_VIOLATION"`).

## Prerequisite

- [ ] PR #77 (`fix/error-propagation`) merged into `dev`.
- [ ] This branch rebased/merged onto `dev` so `src/errors/persistenceErrors.ts`
      is available.

## Work items

### 1. `recordEvent` — detect duplicate via typed error

- File: `src/services/webhooks/MercadoPagoWebhookService.ts` (line ~53)
- Current: insert + catch, then `findByPaymentId` recheck to decide whether the
  failure was a duplicate (avoids depending on the error refactor).
- Target: catch the unique violation as `ConflictError` with
  `code === "UNIQUE_VIOLATION"` from `persistenceErrors` and treat it as an
  already-recorded event, dropping the recheck query.

### 2. `processWebhook` — idempotency by duplicate inside the transaction

- File: `src/services/webhooks/MercadoPagoWebhookService.ts` (line ~158)
- Current: any transaction failure logs and rethrows.
- Target: when the failure is a unique violation on `payment_events`
  (`ConflictError`, `code === "UNIQUE_VIOLATION"`), return
  `already_processed` instead of throwing, so retried duplicate webhooks
  resolve idempotently.

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Unit tests: `npm run test:unit`
- [ ] Integration: webhook suites (18 tests) still pass
