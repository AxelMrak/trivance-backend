export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado") {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Petición incorrecta") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso prohibido") {
    super(message, 403);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Error interno del servidor") {
    super(message, 500);
  }
}
