import 'reflect-metadata';

import http from 'node:http';

import type { Container } from './container.js';
import type { CompiledRoute, MatchResult, Router } from './router.js';
import { ValidationException, ValidationPipe } from './pipes/validation.pipe.js';

export interface DispatcherDeps {
  container: Container;
  router: Router;
  validationPipe?: ValidationPipe;
}

export class Dispatcher {
  private readonly container: Container;
  private readonly router: Router;
  private readonly validationPipe: ValidationPipe;

  constructor({ container, router, validationPipe }: DispatcherDeps) {
    this.container = container;
    this.router = router;
    this.validationPipe = validationPipe ?? new ValidationPipe();
  }

  createServer(): http.Server {
    return http.createServer((req, res) => {
      this.handle(req, res).catch((err) => this.sendError(res, err));
    });
  }

  private async handle(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const method = (req.method ?? 'GET').toUpperCase();

    const matched = this.router.match(method, url.pathname);
    if (!matched) {
      this.sendJson(res, 404, {
        statusCode: 404,
        message: `Cannot ${method} ${url.pathname}`,
      });
      return;
    }

    const body = method === 'POST' ? await readJsonBody(req) : undefined;
    const args = await this.buildArgs(matched, url, body);

    const controller = this.container.resolve(matched.route.controller) as Record<
      string,
      unknown
    >;
    const handler = controller[matched.route.handlerName] as (
      ...a: unknown[]
    ) => unknown;

    const result = await handler.apply(controller, args);

    const status = method === 'POST' ? 201 : 200;
    this.sendJson(res, status, result ?? null);
  }

  private async buildArgs(
    matched: MatchResult,
    url: URL,
    body: unknown,
  ): Promise<unknown[]> {
    const { route, pathParams } = matched;
    const indices = Object.keys(route.params).map(Number);
    const argCount = Math.max(route.paramTypes.length, ...indices.map((i) => i + 1), 0);

    const args: unknown[] = new Array(argCount).fill(undefined);

    for (const [indexStr, def] of Object.entries(route.params)) {
      const index = Number(indexStr);
      switch (def.type) {
        case 'param':
          args[index] = pathParams[def.name!];
          break;
        case 'query':
          args[index] = url.searchParams.get(def.name!);
          break;
        case 'body':
          args[index] = await this.validationPipe.transform(
            body,
            route.paramTypes[index],
          );
          break;
      }
    }
    return args;
  }

  private sendError(res: http.ServerResponse, err: unknown): void {
    if (err instanceof ValidationException) {
      this.sendJson(res, 400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: err.errors,
      });
      return;
    }
    this.sendJson(res, 500, {
      statusCode: 500,
      message: err instanceof Error ? err.message : 'Internal Server Error',
    });
  }

  private sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
    const json = JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(json);
  }
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ValidationExceptionFromBadJson());
      }
    });
  });
}

class ValidationExceptionFromBadJson extends ValidationException {
  constructor() {
    super([{ field: 'body', constraints: ['must be valid JSON'] }]);
  }
}

export type { CompiledRoute };
