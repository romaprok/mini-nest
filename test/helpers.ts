import "reflect-metadata";

import { type Application, createApplication } from "../src/index.js";
import type { Constructor } from "../src/index.js";
import type { Container } from "../src/index.js";
import type { CreateApplicationOptions } from "../src/factory.js";

export interface StartedApp {
  app: Application;
  base: string;
}

export async function start(
  controllers: Constructor[],
  options?: CreateApplicationOptions,
): Promise<StartedApp> {
  const app = createApplication(controllers, options);
  const addr = await app.listen(0);
  return { app, base: `http://localhost:${addr.port}` };
}

export interface HttpResult {
  status: number;
  body: unknown;
  text: string;
  headers: Headers;
}

export async function request(
  base: string,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<HttpResult> {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { status: res.status, body: parsed, text, headers: res.headers };
}
