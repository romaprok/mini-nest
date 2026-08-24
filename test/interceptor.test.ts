import "reflect-metadata";

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { UserController } from "../src/app/user.controller.js";
import { LoggingInterceptor } from "../src/interceptors/logging.interceptor.js";
import { request, start } from "./helpers.js";

describe("Interceptor (LoggingInterceptor)", () => {
  test("interceptor logs request with timing in ms", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    try {
      const { app, base } = await start([UserController], {
        globalInterceptors: [LoggingInterceptor],
      });
      after(() => app.close());

      await request(base, "GET", "/users");

      console.log = originalLog;

      const timingLog = logs.find(
        (log) => log.includes("GET") && log.includes("/users"),
      );
      assert.ok(timingLog, "Should have a log entry for GET /users");

      assert.match(
        timingLog,
        /[0-9]+(\.[0-9]+)? ?ms/,
        "Log should contain timing in ms",
      );
    } finally {
      console.log = originalLog;
    }
  });

  test("interceptor includes request ID in log", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    try {
      const { app, base } = await start([UserController], {
        globalInterceptors: [LoggingInterceptor],
      });
      after(() => app.close());

      await request(base, "GET", "/users");

      console.log = originalLog;

      const timingLog = logs.find(
        (log) => log.includes("GET") && log.includes("/users"),
      );
      assert.ok(timingLog, "Should have a log entry");

      assert.match(
        timingLog,
        /\[.+\]/,
        "Log should contain request ID in brackets",
      );
    } finally {
      console.log = originalLog;
    }
  });
});
