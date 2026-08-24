import "reflect-metadata";

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { Controller } from "../src/decorators/controller.js";
import { Get } from "../src/decorators/methods.js";
import { NotFoundError } from "../src/errors/http-errors.js";
import { request, start } from "./helpers.js";

describe("Exception filter", () => {
  @Controller("errors")
  class ErrorController {
    @Get("not-found")
    throwNotFound() {
      throw new NotFoundError("Resource not found");
    }

    @Get("boom")
    throwUnexpected() {
      throw new Error("boom");
    }

    @Get("with-stack")
    throwWithStack() {
      const error = new Error("Internal error with sensitive info");
      error.stack = "at /home/user/secret/path.ts:42";
      throw error;
    }
  }

  test("NotFoundError maps to 404 with meaningful message", async () => {
    const { app, base } = await start([ErrorController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/errors/not-found");

    assert.equal(res.status, 404);
    assert.match((res.body as { message: string }).message, /not found/i);
  });

  test("unexpected error maps to 500 without exposing message", async () => {
    const { app, base } = await start([ErrorController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/errors/boom");

    assert.equal(res.status, 500);

    assert.doesNotMatch(
      res.text,
      /boom/,
      "Should not expose internal error message",
    );
  });

  test("unexpected error does not expose stack trace", async () => {
    const { app, base } = await start([ErrorController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/errors/with-stack");

    assert.equal(res.status, 500);

    assert.doesNotMatch(
      res.text,
      /at .*\.ts:/,
      "Should not expose stack trace",
    );
    assert.doesNotMatch(res.text, /secret/, "Should not expose file paths");
  });

  test("500 response has generic message", async () => {
    const { app, base } = await start([ErrorController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/errors/boom");

    assert.equal(res.status, 500);
    assert.equal(
      (res.body as { message: string }).message,
      "Internal Server Error",
      "Should have generic error message",
    );
  });
});
