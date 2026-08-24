import "reflect-metadata";

import type { AddressInfo } from "node:net";
import type http from "node:http";

import { Container } from "./container.js";
import { Dispatcher } from "./dispatcher.js";
import { Router } from "./router.js";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe.js";
import { GlobalExceptionFilter } from "./filters/exception.filter.js";
import { LoggingInterceptor } from "./interceptors/logging.interceptor.js";
import { ContextMiddleware } from "./middlewares/context.middleware.js";
import type { Constructor } from "./tokens.js";
import type { Guard } from "./guards/guard.interface.js";
import type { Interceptor } from "./interceptors/interceptor.interface.js";
import type { Middleware } from "./middlewares/middleware.interface.js";
import type { Pipe } from "./pipes/pipe.interface.js";
import type { ExceptionFilter } from "./filters/exception-filter.interface.js";

export interface Application {
  server: http.Server;
  container: Container;
  router: Router;
  dispatcher: Dispatcher;
  listen(port?: number): Promise<AddressInfo>;
  close(): Promise<void>;
}

export interface CreateApplicationOptions {
  configure?: (container: Container) => void;
  globalMiddlewares?: Constructor<Middleware>[];
  globalGuards?: Constructor<Guard>[];
  globalInterceptors?: Constructor<Interceptor>[];
  pipes?: Pipe[];
  exceptionFilter?: ExceptionFilter;
  disableLogging?: boolean;
  disableContextMiddleware?: boolean;
}

export function createApplication(
  controllers: Constructor[],
  options: CreateApplicationOptions = {},
): Application {
  const container = new Container();
  options.configure?.(container);

  const router = new Router().registerAll(controllers);

  const pipes = options.pipes ?? [new ZodValidationPipe()];

  const exceptionFilter =
    options.exceptionFilter ?? new GlobalExceptionFilter();

  const globalMiddlewares = options.globalMiddlewares ?? [];
  if (!options.disableContextMiddleware && globalMiddlewares.length === 0) {
    globalMiddlewares.push(ContextMiddleware);
  }

  const globalInterceptors = options.globalInterceptors ?? [];
  if (!options.disableLogging && globalInterceptors.length === 0) {
    globalInterceptors.push(LoggingInterceptor);
  }

  const dispatcher = new Dispatcher({
    container,
    router,
    pipes,
    exceptionFilter,
    globalMiddlewares,
    globalGuards: options.globalGuards ?? [],
    globalInterceptors,
  });

  const server = dispatcher.createServer();

  return {
    server,
    container,
    router,
    dispatcher,
    listen(port = 0) {
      return new Promise<AddressInfo>((resolve) => {
        server.listen(port, () => resolve(server.address() as AddressInfo));
      });
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
