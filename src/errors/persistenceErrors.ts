import { DatabaseError as PgDatabaseError } from "pg";

import {
  AppError,
  BadRequestError,
  ConflictError,
  DatabaseError,
  InternalServerError,
} from "@/errors/httpErrors";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";
const INVALID_TEXT_REPRESENTATION = "22P02";
const NUMERIC_VALUE_OUT_OF_RANGE = "22003";
const STRING_DATA_RIGHT_TRUNCATION = "22001";

const UNDEFINED_TABLE = "42P01";
const UNDEFINED_COLUMN = "42703";

const CLIENT_EMAIL_CONSTRAINT = "uq_clients_email_company";

export function isSchemaError(error: unknown): boolean {
  return (
    error instanceof PgDatabaseError &&
    (error.code === UNDEFINED_TABLE || error.code === UNDEFINED_COLUMN)
  );
}

export function mapDatabaseError(error: PgDatabaseError): AppError {
  const options = { cause: error };

  switch (error.code) {
    case UNIQUE_VIOLATION: {
      if (error.constraint === CLIENT_EMAIL_CONSTRAINT) {
        return new ConflictError("El correo electrónico ya existe y pertenece a otro cliente.", {
          ...options,
          code: "UNIQUE_VIOLATION",
        });
      }
      return new ConflictError("Los datos enviados ya existen.", {
        ...options,
        code: "UNIQUE_VIOLATION",
      });
    }
    case FOREIGN_KEY_VIOLATION:
      return new BadRequestError("El registro referenciado no existe.", {
        ...options,
        code: "FOREIGN_KEY_VIOLATION",
      });
    case NOT_NULL_VIOLATION:
      return new BadRequestError("Faltan datos obligatorios.", {
        ...options,
        code: "NOT_NULL_VIOLATION",
      });
    case INVALID_TEXT_REPRESENTATION:
    case NUMERIC_VALUE_OUT_OF_RANGE:
    case STRING_DATA_RIGHT_TRUNCATION:
      return new BadRequestError("Uno de los valores enviados es inválido.", {
        ...options,
        code: "INVALID_INPUT",
      });
    default:
      return new DatabaseError("Servicio de base de datos no disponible.", {
        ...options,
        code: "QUERY_FAILED",
      });
  }
}

export function handleDatabaseError(error: unknown): never {
  if (error instanceof PgDatabaseError) {
    throw mapDatabaseError(error);
  }

  if (error instanceof Error) {
    throw new DatabaseError("Servicio de base de datos no disponible.", {
      cause: error,
      code: "QUERY_FAILED",
    });
  }

  throw new InternalServerError("Error interno del servidor", { cause: error });
}
