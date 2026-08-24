import type http from "node:http";

import { Injectable } from "../decorators/injectable.js";
import { getRequestContext } from "../context/request-context.js";
import type { Middleware } from "./middleware.interface.js";

@Injectable()
export class ContextMiddleware implements Middleware {
  use(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => void | Promise<void>,
  ): void {
    const store = getRequestContext();
    const method = (req.method ?? "GET").toUpperCase();
    const url = new URL(req.url ?? "/", "http://localhost");

    res.on("finish", () => {
      this.onResponseFinish(
        res,
        store?.requestId ?? "unknown",
        store?.startTime ?? performance.now(),
      );
    });

    this.onRequestStart(method, url.pathname, store?.requestId ?? "unknown");

    Promise.resolve(next()).catch((error) => {
      console.error(
        `[${store?.requestId ?? "unknown"}] Unhandled error in middleware chain:`,
        error,
      );
    });
  }

  private onRequestStart(
    method: string,
    path: string,
    requestId: string,
  ): void {}

  private onResponseFinish(
    res: http.ServerResponse,
    requestId: string,
    startTime: number,
  ): void {
    const duration = performance.now() - startTime;
    const statusCode = res.statusCode;

    console.log(`[${requestId}] ← ${statusCode} (${duration.toFixed(1)} ms)`);
  }
}
