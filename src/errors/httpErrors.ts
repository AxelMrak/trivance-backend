export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, options?: { cause?: unknown }) {
    super(message, options);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado", options?: { cause?: unknown }) {
    super(message, 404, options);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Petición incorrecta", options?: { cause?: unknown }) {
    super(message, 400, options);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Conflicto con un registro existente",
    options?: { cause?: unknown },
  ) {
    super(message, 409, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado", options?: { cause?: unknown }) {
    super(message, 401, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso prohibido", options?: { cause?: unknown }) {
    super(message, 403, options);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Error interno del servidor", options?: { cause?: unknown }) {
    super(message, 500, options);
  }
}
