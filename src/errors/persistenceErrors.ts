import { DatabaseError } from "pg";

import { AppError, BadRequestError, ConflictError, InternalServerError } from "@/errors/httpErrors";


const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";
const INVALID_TEXT_REPRESENTATION = "22P02";
const NUMERIC_VALUE_OUT_OF_RANGE = "22003";
const STRING_DATA_RIGHT_TRUNCATION = "22001";

const CLIENT_EMAIL_CONSTRAINT = "uq_clients_email_company";

export function mapDatabaseError(error: DatabaseError): AppError {
  const options = { cause: error };

  switch (error.code) {
    case UNIQUE_VIOLATION: {
      if (error.constraint === CLIENT_EMAIL_CONSTRAINT) {
        return new ConflictError(
          "El correo electrónico ya existe y pertenece a otro cliente.",
          options,
        );
      }
      return new ConflictError("Los datos enviados ya existen.", options);
    }
    case FOREIGN_KEY_VIOLATION:
      return new BadRequestError("El registro referenciado no existe.", options);
    case NOT_NULL_VIOLATION:
      return new BadRequestError("Faltan datos obligatorios.", options);
    case INVALID_TEXT_REPRESENTATION:
    case NUMERIC_VALUE_OUT_OF_RANGE:
    case STRING_DATA_RIGHT_TRUNCATION:
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
