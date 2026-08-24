import type http from "node:http";

export interface ExecutionContext {
  request: http.IncomingMessage;
  method: string;
  path: string;
  controller: Function;
  handlerName: string;
}

export interface Guard {
  /**
   * Determine if the request should be allowed to proceed.
   *
   * @param context - Information about the current request
   * @returns true to allow, false to block with 403
   * @throws HttpError for custom status codes (401, 429, etc.)
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}
