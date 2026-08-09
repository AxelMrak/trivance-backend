import { DatabaseError as PgDatabaseError } from "pg";

import {
  BadRequestError,
  ConflictError,
  DatabaseError,
  InternalServerError,
} from "@/errors/httpErrors";
import { handleDatabaseError, isSchemaError, mapDatabaseError } from "@/errors/persistenceErrors";

function buildPgError(code: string, constraint?: string): PgDatabaseError {
  const error = new PgDatabaseError("fake database error", 1, "error");
  error.code = code;
  if (constraint) error.constraint = constraint;
  return error;
}

describe("mapDatabaseError", () => {
  it("maps a unique violation on the client email constraint to ConflictError 409", () => {
    const cause = buildPgError("23505", "uq_clients_email_company");
    const mapped = mapDatabaseError(cause);

    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe("UNIQUE_VIOLATION");
    expect(mapped.cause).toBe(cause);
  });

  it("maps a generic unique violation to ConflictError 409", () => {
    const mapped = mapDatabaseError(buildPgError("23505", "other_constraint"));

    expect(mapped).toBeInstanceOf(ConflictError);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe("UNIQUE_VIOLATION");
  });

  it("maps invalid input codes to BadRequestError 400 with INVALID_INPUT", () => {
    const mapped = mapDatabaseError(buildPgError("22P02"));

    expect(mapped).toBeInstanceOf(BadRequestError);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe("INVALID_INPUT");
  });

  it("maps unknown pg codes to DatabaseError 503 with QUERY_FAILED", () => {
    const mapped = mapDatabaseError(buildPgError("99999"));

    expect(mapped).toBeInstanceOf(DatabaseError);
    expect(mapped.statusCode).toBe(503);
    expect(mapped.code).toBe("QUERY_FAILED");
  });
});

describe("handleDatabaseError", () => {
  it("wraps plain connection errors into DatabaseError 503 QUERY_FAILED with cause preserved", () => {
    const cause = new Error("connect ECONNREFUSED 127.0.0.1:5432");

    try {
      handleDatabaseError(cause);
      throw new Error("expected handleDatabaseError to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(DatabaseError);
      const dbError = thrown as DatabaseError;
      expect(dbError.statusCode).toBe(503);
      expect(dbError.code).toBe("QUERY_FAILED");
      expect(dbError.cause).toBe(cause);
    }
  });

  it("maps non-Error thrown values into InternalServerError 500", () => {
    const value = "connection lost";

    try {
      handleDatabaseError(value);
      throw new Error("expected handleDatabaseError to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(InternalServerError);
      const serverError = thrown as InternalServerError;
      expect(serverError.statusCode).toBe(500);
      expect(serverError.cause).toBe(value);
    }
  });

  it("routes pg errors through mapDatabaseError", () => {
    try {
      handleDatabaseError(buildPgError("22P02"));
      throw new Error("expected handleDatabaseError to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(BadRequestError);
      expect((thrown as BadRequestError).statusCode).toBe(400);
      expect((thrown as BadRequestError).code).toBe("INVALID_INPUT");
    }
  });
});

describe("isSchemaError", () => {
  it("returns true for undefined table and column codes", () => {
    expect(isSchemaError(buildPgError("42P01"))).toBe(true);
    expect(isSchemaError(buildPgError("42703"))).toBe(true);
  });

  it("returns false for non-schema codes", () => {
    expect(isSchemaError(buildPgError("22P02"))).toBe(false);
  });
});
