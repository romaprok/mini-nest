import type http from "node:http";

import { Injectable } from "../decorators/injectable.js";
import { getRequestContext } from "../context/request-context.js";
import {
  HttpError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
  TooManyRequestsError,
} from "../errors/http-errors.js";
import type {
  ExceptionFilter,
  ExceptionResponse,
} from "./exception-filter.interface.js";

@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(error: unknown, request: http.IncomingMessage): ExceptionResponse {
    const requestId = getRequestContext()?.requestId ?? "unknown";

    this.logError(error, request, requestId);

    if (error instanceof HttpError) {
      return this.handleHttpError(error);
    }

    return this.handleUnknownError();
  }

  private handleHttpError(error: HttpError): ExceptionResponse {
    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: {
          statusCode: 400,
          message: "Validation failed",
          errors: error.fieldErrors,
        },
      };
    }

    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        body: {
          statusCode: 401,
          message: error.message,
        },
      };
    }

    if (error instanceof ForbiddenError) {
      return {
        statusCode: 403,
        body: {
          statusCode: 403,
          message: error.message,
        },
      };
    }

    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: {
          statusCode: 404,
          message: error.message,
        },
      };
    }

    if (error instanceof TooManyRequestsError) {
      return {
        statusCode: 429,
        body: {
          statusCode: 429,
          message: error.message,
        },
      };
    }

    return {
      statusCode: error.statusCode,
      body: {
        statusCode: error.statusCode,
        message: error.message,
      },
    };
  }

  private handleUnknownError(): ExceptionResponse {
    return {
      statusCode: 500,
      body: {
        statusCode: 500,
        message: "Internal Server Error",
      },
    };
  }

  private logError(
    error: unknown,
    request: http.IncomingMessage,
    requestId: string,
  ): void {
    const method = request.method ?? "UNKNOWN";
    const url = request.url ?? "/";

    if (error instanceof Error) {
      console.error(
        `[${requestId}] ${method} ${url} - Error: ${error.message}`,
        error.stack,
      );
    } else {
      console.error(`[${requestId}] ${method} ${url} - Unknown error:`, error);
    }
  }
}
