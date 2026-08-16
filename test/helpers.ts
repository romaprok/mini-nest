import 'reflect-metadata';

import { type Application, createApplication } from '../src/index.js';
import type { Constructor } from '../src/index.js';
import type { Container } from '../src/index.js';

export interface StartedApp {
  app: Application;
  base: string;
}

export async function start(
  controllers: Constructor[],
  configure?: (container: Container) => void,
): Promise<StartedApp> {
  const app = createApplication(controllers, configure ? { configure } : undefined);
  const addr = await app.listen(0);
  return { app, base: `http://localhost:${addr.port}` };
}

export interface HttpResult {
  status: number;
  body: unknown;
  text: string;
}

export async function request(
  base: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<HttpResult> {
  const res = await fetch(base + path, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { status: res.status, body: parsed, text };
}
