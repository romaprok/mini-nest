import "reflect-metadata";

import http from "node:http";

import type { Container } from "./container.js";
import type { CompiledRoute, MatchResult, Router } from "./router.js";
import type { ExecutionContext, Guard } from "./guards/guard.interface.js";
import type {
  Interceptor,
  NextFunction,
} from "./interceptors/interceptor.interface.js";
import type { Pipe, ArgumentMetadata } from "./pipes/pipe.interface.js";
import type { ExceptionFilter } from "./filters/exception-filter.interface.js";
import type { Middleware } from "./middlewares/middleware.interface.js";
import {
  createRequestStore,
  runWithRequestContext,
  getRequestContext,
} from "./context/request-context.js";
import { ForbiddenError, NotFoundError } from "./errors/http-errors.js";
import {
  getControllerGuards,
  getMethodGuards,
} from "./decorators/use-guards.js";
import {
  getControllerInterceptors,
  getMethodInterceptors,
} from "./decorators/use-interceptors.js";
import type { Constructor } from "./tokens.js";

export interface DispatcherDeps {
  container: Container;
  router: Router;
  pipes?: Pipe[];
  exceptionFilter?: ExceptionFilter;
  globalGuards?: Constructor<Guard>[];
  globalInterceptors?: Constructor<Interceptor>[];
  globalMiddlewares?: Constructor<Middleware>[];
}

export class Dispatcher {
  private readonly container: Container;
  private readonly router: Router;
  private readonly pipes: Pipe[];
  private readonly exceptionFilter?: ExceptionFilter;
  private readonly globalGuards: Constructor<Guard>[];
  private readonly globalInterceptors: Constructor<Interceptor>[];
  private readonly globalMiddlewares: Constructor<Middleware>[];

  constructor({
    container,
    router,
    pipes,
    exceptionFilter,
    globalGuards,
    globalInterceptors,
    globalMiddlewares,
  }: DispatcherDeps) {
    this.container = container;
    this.router = router;
    this.pipes = pipes ?? [];
    this.exceptionFilter = exceptionFilter;
    this.globalGuards = globalGuards ?? [];
    this.globalInterceptors = globalInterceptors ?? [];
    this.globalMiddlewares = globalMiddlewares ?? [];
  }

  createServer(): http.Server {
    return http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): void {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = (req.method ?? "GET").toUpperCase();
    const clientRequestId = req.headers["x-request-id"] as string | undefined;

    const store = createRequestStore(method, url.pathname, clientRequestId);

    const middlewares = this.globalMiddlewares.map((M) =>
      this.container.resolve(M),
    );

    const runLifecycle = async (): Promise<void> => {
      try {
        const { statusCode, body } = await this.executeLifecycle(
          req,
          res,
          method,
          url,
        );
        this.sendJson(res, statusCode, body, store.requestId);
      } catch (error) {
        const response = this.exceptionFilter?.catch(error, req) ?? {
          statusCode: 500,
          body: { statusCode: 500, message: "Internal Server Error" },
        };
        this.sendJson(res, response.statusCode, response.body, store.requestId);
      }
    };

    let next: () => void | Promise<void> = runLifecycle;
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const currentNext = next;
      next = () => middleware.use(req, res, currentNext);
    }

    runWithRequestContext(store, () => {
      Promise.resolve(next()).catch((error) => {
        console.error(
          `[${store.requestId}] Unhandled middleware error:`,
          error,
        );
        if (!res.headersSent) {
          this.sendJson(
            res,
            500,
            { statusCode: 500, message: "Internal Server Error" },
            store.requestId,
          );
        }
      });
    });
  }

  private async executeLifecycle(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    method: string,
    url: URL,
  ): Promise<{ statusCode: number; body: unknown }> {
    try {
      const matched = this.router.match(method, url.pathname);
      if (!matched) {
        throw new NotFoundError(`Cannot ${method} ${url.pathname}`);
      }

      const context: ExecutionContext = {
        request: req,
        method,
        path: url.pathname,
        controller: matched.route.controller,
        handlerName: matched.route.handlerName,
      };

      await this.runGuards(context, matched.route);

      const body =
        method === "POST" || method === "PUT" || method === "PATCH"
          ? await readJsonBody(req)
          : undefined;

      const result = await this.runInterceptors(
        context,
        matched.route,
        async () => {
          const args = await this.buildArgs(matched, url, body);

          const controller = this.container.resolve(
            matched.route.controller,
          ) as Record<string, unknown>;
          const handler = controller[matched.route.handlerName] as (
            ...a: unknown[]
          ) => unknown;

          return handler.apply(controller, args);
        },
      );

      const statusCode = method === "POST" ? 201 : 200;
      return { statusCode, body: result ?? null };
    } catch (error) {
      if (this.exceptionFilter) {
        return this.exceptionFilter.catch(error, req);
      }
      throw error;
    }
  }

  private async runGuards(
    context: ExecutionContext,
    route: CompiledRoute,
  ): Promise<void> {
    const guardClasses = [
      ...this.globalGuards,
      ...getControllerGuards(route.controller),
      ...getMethodGuards(route.controller, route.handlerName),
    ];

    for (const GuardClass of guardClasses) {
      const guard = this.container.resolve(GuardClass);
      const canActivate = await guard.canActivate(context);
      if (!canActivate) {
        throw new ForbiddenError("Access denied");
      }
    }
  }

  private async runInterceptors(
    context: ExecutionContext,
    route: CompiledRoute,
    handler: NextFunction,
  ): Promise<unknown> {
    const interceptorClasses = [
      ...this.globalInterceptors,
      ...getControllerInterceptors(route.controller),
      ...getMethodInterceptors(route.controller, route.handlerName),
    ];

    let next: NextFunction = handler;

    for (let i = interceptorClasses.length - 1; i >= 0; i--) {
      const InterceptorClass = interceptorClasses[i];
      const interceptor = this.container.resolve(InterceptorClass);
      const currentNext = next;
      next = () => interceptor.intercept(context, currentNext);
    }

    return next();
  }

  private async buildArgs(
    matched: MatchResult,
    url: URL,
    body: unknown,
  ): Promise<unknown[]> {
    const { route, pathParams } = matched;
    const indices = Object.keys(route.params).map(Number);
    const argCount = Math.max(
      route.paramTypes.length,
      ...indices.map((i) => i + 1),
      0,
    );

    const args: unknown[] = new Array(argCount).fill(undefined);

    for (const [indexStr, def] of Object.entries(route.params)) {
      const index = Number(indexStr);
      let value: unknown;
      let metadata: ArgumentMetadata;

      switch (def.type) {
        case "param":
          value = pathParams[def.name!];
          metadata = {
            type: "param",
            name: def.name,
            metatype: route.paramTypes[index],
          };
          break;
        case "query":
          value = url.searchParams.get(def.name!) ?? undefined;
          metadata = {
            type: "query",
            name: def.name,
            metatype: route.paramTypes[index],
          };
          break;
        case "body":
          value = body;
          metadata = { type: "body", metatype: route.paramTypes[index] };
          break;
        default:
          continue;
      }

      for (const pipe of this.pipes) {
        value = await pipe.transform(value, metadata);
      }

      args[index] = value;
    }

    return args;
  }

  private sendJson(
    res: http.ServerResponse,
    status: number,
    payload: unknown,
    requestId: string,
  ): void {
    const json = JSON.stringify(payload);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    });
    res.end(json);
  }
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new SyntaxError("Invalid JSON"));
      }
    });
  });
}

export type { CompiledRoute };
