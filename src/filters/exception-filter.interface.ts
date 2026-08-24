import type http from "node:http";

export interface ExceptionResponse {
  statusCode: number;
  body: unknown;
}

export interface ExceptionFilter {
  /**
   * Handle an exception and return an HTTP response.
   * @param error - The caught exception
   * @param request - The original request (for logging context)
   * @returns The response to send to the client
   */
  catch(error: unknown, request: http.IncomingMessage): ExceptionResponse;
}
