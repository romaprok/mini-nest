export abstract class HttpError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends HttpError {
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends HttpError {
  readonly statusCode = 401;

  constructor(message = "Unauthorized") {
    super(message);
  }
}

export class ForbiddenError extends HttpError {
  readonly statusCode = 403;

  constructor(message = "Forbidden") {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  readonly statusCode = 404;

  constructor(message = "Not Found") {
    super(message);
  }
}

export class TooManyRequestsError extends HttpError {
  readonly statusCode = 429;

  constructor(message = "Too Many Requests") {
    super(message);
  }
}

export class InternalServerError extends HttpError {
  readonly statusCode = 500;

  constructor(message = "Internal Server Error") {
    super(message);
  }
}

export class ValidationError extends BadRequestError {
  constructor(
    public readonly fieldErrors: Array<{ field: string; message: string }>,
  ) {
    super("Validation failed", fieldErrors);
  }
}
