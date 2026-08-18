import { DatabaseError as PgDatabaseError } from "pg";

import {
  AppError,
  BadRequestError,
  ConflictError,
  DatabaseError,
  InternalServerError,
} from "@/errors/httpErrors";

const POSTGRES_ERROR_CODE = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NUMERIC_VALUE_OUT_OF_RANGE: "22003",
  STRING_DATA_RIGHT_TRUNCATION: "22001",
} as const;

const POSTGRES_ERROR = {
  UNDEFINED_TABLE: "42P01",
  UNDEFINED_COLUMN: "42703",
} as const;

const POSTGRES_CONSTRAINT = {
  CLIENT_EMAIL: "uq_clients_email_company",
} as const;

export function isSchemaError(error: unknown): boolean {
  return (
    error instanceof PgDatabaseError &&
    (error.code === POSTGRES_ERROR.UNDEFINED_TABLE ||
      error.code === POSTGRES_ERROR.UNDEFINED_COLUMN)
  );
}

export function mapDatabaseError(error: PgDatabaseError): AppError {
  const options = { cause: error };

  switch (error.code) {
    case POSTGRES_ERROR_CODE.UNIQUE_VIOLATION: {
      if (error.constraint === POSTGRES_CONSTRAINT.CLIENT_EMAIL) {
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

    case POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION:
      return new BadRequestError("El registro referenciado no existe.", {
        ...options,
        code: "FOREIGN_KEY_VIOLATION",
      });

    case POSTGRES_ERROR_CODE.NOT_NULL_VIOLATION:
      return new BadRequestError("Faltan datos obligatorios.", {
        ...options,
        code: "NOT_NULL_VIOLATION",
      });

    case POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION:
    case POSTGRES_ERROR_CODE.NUMERIC_VALUE_OUT_OF_RANGE:
    case POSTGRES_ERROR_CODE.STRING_DATA_RIGHT_TRUNCATION:
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
