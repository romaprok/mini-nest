import type http from "node:http";

export interface Middleware {
  /**
   * Process the request. Call next() to continue to the next middleware
   * or the route handler.
   *
   * @param req - Raw Node.js request object
   * @param res - Raw Node.js response object
   * @param next - Function to call the next middleware in the chain
   */
  use(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => void | Promise<void>,
  ): void | Promise<void>;
}

export type MiddlewareFunction = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void | Promise<void>,
) => void | Promise<void>;
