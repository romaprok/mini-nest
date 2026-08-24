import "reflect-metadata";

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { UserController } from "../src/app/user.controller.js";
import { request, start } from "./helpers.js";

describe("Guard (AuthGuard)", () => {
  test("POST /users without Authorization header returns 403", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "POST", "/users", {
      name: "Test User",
      email: "test@example.com",
    });

    assert.equal(res.status, 403);
  });

  test("POST /users with invalid Authorization header returns 403", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(
      base,
      "POST",
      "/users",
      { name: "Test User", email: "test@example.com" },
      { Authorization: "InvalidFormat" },
    );

    assert.equal(res.status, 403);
  });

  test("POST /users with empty Bearer token returns 403", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(
      base,
      "POST",
      "/users",
      { name: "Test User", email: "test@example.com" },
      { Authorization: "Bearer " },
    );

    assert.equal(res.status, 403);
  });

  test("POST /users with valid Bearer token returns 201", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(
      base,
      "POST",
      "/users",
      { name: "Test User", email: "test@example.com" },
      { Authorization: "Bearer valid-token" },
    );

    assert.equal(res.status, 201);
    assert.equal((res.body as { name: string }).name, "Test User");
  });

  test("guard blocks before handler executes (handler not called)", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const before = await request(base, "GET", "/users");
    const countBefore = (before.body as unknown[]).length;

    const res = await request(base, "POST", "/users", {
      name: "Should Not Exist",
      email: "blocked@example.com",
    });

    assert.equal(res.status, 403);

    const afterRes = await request(base, "GET", "/users");
    const countAfter = (afterRes.body as unknown[]).length;

    assert.equal(
      countAfter,
      countBefore,
      "User count should not change when guard blocks",
    );
  });
});
