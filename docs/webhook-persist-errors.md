# Webhook Persistence Error Handling — Tracking

This branch implements the `TODO(jrz-errors)` items in the MercadoPago webhook
flow using `src/errors/persistenceErrors.ts` (from PR #77,
`refactor: centralize database error handling`), which maps SQLSTATE codes to
typed errors (`ConflictError` with `code: "UNIQUE_VIOLATION"`).

## Prerequisite (done)

- [x] PR #77 (`fix/error-propagation`) merged into `dev`.
- [x] This branch rebased onto `dev` so `src/errors/persistenceErrors.ts`
      is available.

## Work items

### 1. `recordEvent` — detect duplicate via typed error

- File: `src/services/webhooks/MercadoPagoWebhookService.ts` (recordEvent)
- Done: the unique violation on `payment_events.payment_id` (SQLSTATE 23505)
  is caught, mapped via `mapDatabaseError`, and treated as an
  already-recorded event when it is a `ConflictError` with
  `code === "UNIQUE_VIOLATION"`. The `findByPaymentId` recheck query was
  dropped.

### 2. `processWebhook` — idempotency by duplicate inside the transaction

- File: `src/services/webhooks/MercadoPagoWebhookService.ts` (processWebhook)
- Done: when the transaction failure is a unique violation on
  `payment_events` (`ConflictError`, `code === "UNIQUE_VIOLATION"`), the
  webhook returns `already_processed` instead of throwing, so retried
  duplicate webhooks resolve idempotently.

## Verification

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] Unit tests: `npm run test:unit` (65 passed)
- [x] Integration: webhook suites (18 passed)
