import "reflect-metadata";

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { UserController } from "../src/app/user.controller.js";
import { request, start } from "./helpers.js";

describe("AsyncLocalStorage / Request Context", () => {
  test("X-Request-Id header is returned in response", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/users");

    const requestId = res.headers.get("x-request-id");
    assert.ok(requestId, "Response should have X-Request-Id header");
    assert.ok(requestId.length > 0, "Request ID should not be empty");
  });

  test("client-provided X-Request-Id is echoed back", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const customId = "my-custom-request-id-12345";
    const res = await request(base, "GET", "/users", undefined, {
      "X-Request-Id": customId,
    });

    const returnedId = res.headers.get("x-request-id");
    assert.equal(
      returnedId,
      customId,
      "Should return the same request ID client sent",
    );
  });

  test("parallel requests do not mix up contexts", async () => {
    const { app, base } = await start([UserController], {
      disableLogging: true,
    });
    after(() => app.close());

    const requestIds = Array.from(
      { length: 10 },
      (_, i) => `parallel-request-${i}`,
    );

    const responses = await Promise.all(
      requestIds.map((id) =>
        request(base, "GET", "/users", undefined, { "X-Request-Id": id }),
      ),
    );

    for (let i = 0; i < responses.length; i++) {
      const returnedId = responses[i].headers.get("x-request-id");
      assert.equal(
        returnedId,
        requestIds[i],
        `Request ${i} should have its own ID, not another request's`,
      );
    }
  });

  test("service accesses requestId without parameter (via ALS)", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };

    try {
      const { app, base } = await start([UserController], {
        disableLogging: true,
      });
      after(() => app.close());

      const customId = "als-test-id";
      await request(base, "GET", "/users", undefined, {
        "X-Request-Id": customId,
      });

      console.log = originalLog;

      const serviceLog = logs.find((log) =>
        log.includes("UserService.findAll"),
      );
      assert.ok(serviceLog, "UserService should have logged");
      assert.ok(
        serviceLog.includes(customId),
        "Service log should contain the request ID from ALS",
      );
    } finally {
      console.log = originalLog;
    }
  });
});
