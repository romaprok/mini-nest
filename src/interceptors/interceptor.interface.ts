import type { ExecutionContext } from "../guards/guard.interface.js";

export type NextFunction = () => Promise<unknown>;

export interface Interceptor {
  /**
   * Intercept the request/response cycle.
   * @param context - Information about the current request
   * @param next - Call this to proceed to the handler (or next interceptor)
   * @returns The (possibly transformed) response
   */
  intercept(context: ExecutionContext, next: NextFunction): Promise<unknown>;
}
