import { Injectable } from "../decorators/injectable.js";
import { getRequestContext } from "../context/request-context.js";
import type { ExecutionContext } from "../guards/guard.interface.js";
import type { Interceptor, NextFunction } from "./interceptor.interface.js";

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(
    context: ExecutionContext,
    next: NextFunction,
  ): Promise<unknown> {
    const start = performance.now();
    const { method, path } = context;

    try {
      const result = await next();

      const duration = performance.now() - start;
      this.log(method, path, duration);

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log(method, path, duration, "ERROR");
      throw error;
    }
  }

  private log(
    method: string,
    path: string,
    duration: number,
    status = "OK",
  ): void {
    const requestId = getRequestContext()?.requestId ?? "no-context";
    const durationStr = duration.toFixed(1);
    console.log(
      `${method} ${path} — ${durationStr} ms [${requestId}] ${status}`,
    );
  }
}
