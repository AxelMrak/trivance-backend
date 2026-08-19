export class AppError extends Error {
  public readonly statusCode: number;

  public readonly code?: string;

  constructor(message: string, statusCode: number, options?: { cause?: unknown; code?: string }) {
    super(message, options);
    this.statusCode = statusCode;
    this.code = options?.code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, options: { cause?: unknown; code?: string } = {}) {
    super(message, 503, options);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = "Recurso no encontrado",
    options?: { cause?: unknown; code?: string },
  ) {
    super(message, 404, options);
  }
}

export class BadRequestError extends AppError {
  constructor(
    message: string = "Petición incorrecta",
    options?: { cause?: unknown; code?: string },
  ) {
    super(message, 400, options);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Conflicto con un registro existente",
    options?: { cause?: unknown; code?: string },
  ) {
    super(message, 409, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado", options?: { cause?: unknown; code?: string }) {
    super(message, 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso prohibido", options?: { cause?: unknown; code?: string }) {
    super(message, 403, options);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message: string = "Error interno del servidor",
    options?: { cause?: unknown; code?: string },
  ) {
    super(message, 500, options);
  }
}
