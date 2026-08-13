import { DatabaseError } from "pg";

import { AppError, BadRequestError, ConflictError, InternalServerError } from "@/errors/httpErrors";

const POSTGRES_ERROR_CODE = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  INVALID_TEXT_REPRESENTATION: "22P02",
  NUMERIC_VALUE_OUT_OF_RANGE: "22003",
  STRING_DATA_RIGHT_TRUNCATION: "22001",
} as const;

const POSTGRES_CONSTRAINT = {
  CLIENT_EMAIL: "uq_clients_email_company",
} as const;

export function mapDatabaseError(error: DatabaseError): AppError {
  const options = { cause: error };

  switch (error.code) {
    case POSTGRES_ERROR_CODE.UNIQUE_VIOLATION: {
      if (error.constraint === POSTGRES_CONSTRAINT.CLIENT_EMAIL) {
        return new ConflictError(
          "El correo electrónico ya existe y pertenece a otro cliente.",
          options,
        );
      }

      return new ConflictError("Los datos enviados ya existen.", options);
    }

    case POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION:
      return new BadRequestError("El registro referenciado no existe.", options);

    case POSTGRES_ERROR_CODE.NOT_NULL_VIOLATION:
      return new BadRequestError("Faltan datos obligatorios.", options);

    case POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION:
    case POSTGRES_ERROR_CODE.NUMERIC_VALUE_OUT_OF_RANGE:
    case POSTGRES_ERROR_CODE.STRING_DATA_RIGHT_TRUNCATION:
      return new BadRequestError("Uno de los valores enviados es inválido.", options);

    default:
      return new InternalServerError("Error de base de datos.", options);
  }
}

export function handleDatabaseError(error: unknown): never {
  if (error instanceof DatabaseError) {
    throw mapDatabaseError(error);
  }

  throw error;
}
