import "reflect-metadata";

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { Controller } from "../src/decorators/controller.js";
import { Get, Post } from "../src/decorators/methods.js";
import { Body } from "../src/decorators/params.js";
import { UseGuards } from "../src/decorators/use-guards.js";
import { UseInterceptors } from "../src/decorators/use-interceptors.js";
import { Injectable } from "../src/decorators/injectable.js";
import type { Guard, ExecutionContext } from "../src/guards/guard.interface.js";
import type {
  Interceptor,
  NextFunction,
} from "../src/interceptors/interceptor.interface.js";
import type { Pipe, ArgumentMetadata } from "../src/pipes/pipe.interface.js";
import type { Middleware } from "../src/middlewares/middleware.interface.js";
import { request, start } from "./helpers.js";

describe("Lifecycle order", () => {
  const executionOrder: string[] = [];

  @Injectable()
  class OrderTrackingGuard implements Guard {
    canActivate(_context: ExecutionContext): boolean {
      executionOrder.push("guard");
      return true;
    }
  }

  @Injectable()
  class OrderTrackingInterceptor implements Interceptor {
    async intercept(
      _context: ExecutionContext,
      next: NextFunction,
    ): Promise<unknown> {
      executionOrder.push("interceptor:before");
      const result = await next();
      executionOrder.push("interceptor:after");
      return result;
    }
  }

  class OrderTrackingPipe implements Pipe {
    transform(value: unknown, _metadata: ArgumentMetadata): unknown {
      executionOrder.push("pipe");
      return value;
    }
  }

  @Injectable()
  class OrderTrackingMiddleware implements Middleware {
    use(_req: unknown, _res: unknown, next: () => void | Promise<void>): void {
      executionOrder.push("middleware");
      void next();
    }
  }

  @UseGuards(OrderTrackingGuard)
  @UseInterceptors(OrderTrackingInterceptor)
  @Controller("test")
  class TestController {
    @Post()
    testEndpoint(@Body() body: unknown) {
      executionOrder.push("handler");
      return { received: body };
    }
  }

  test("lifecycle stages execute in correct order: middleware → guard → interceptor:before → pipe → handler → interceptor:after", async () => {
    executionOrder.length = 0;

    const { app, base } = await start([TestController], {
      pipes: [new OrderTrackingPipe()],
      globalMiddlewares: [OrderTrackingMiddleware],
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "POST", "/test", { data: "test" });

    assert.equal(res.status, 201);

    assert.deepEqual(executionOrder, [
      "middleware",
      "guard",
      "interceptor:before",
      "pipe",
      "handler",
      "interceptor:after",
    ]);
  });

  test("guard blocking prevents handler execution", async () => {
    const blockedOrder: string[] = [];
    let handlerCalled = false;

    @Injectable()
    class BlockingGuard implements Guard {
      canActivate(_context: ExecutionContext): boolean {
        blockedOrder.push("guard");
        return false;
      }
    }

    @UseGuards(BlockingGuard)
    @Controller("blocked")
    class BlockedController {
      @Get()
      shouldNotRun() {
        handlerCalled = true;
        blockedOrder.push("handler");
        return { error: "should not reach here" };
      }
    }

    const { app, base } = await start([BlockedController], {
      disableLogging: true,
    });
    after(() => app.close());

    const res = await request(base, "GET", "/blocked");

    assert.equal(res.status, 403);
    assert.equal(handlerCalled, false, "Handler should NOT have been called");
    assert.deepEqual(blockedOrder, ["guard"], "Only guard should have run");
  });

  test("interceptors execute in order: global → controller → method (before) and method → controller → global (after)", async () => {
    const order: string[] = [];

    @Injectable()
    class GlobalInterceptor implements Interceptor {
      async intercept(
        _context: ExecutionContext,
        next: NextFunction,
      ): Promise<unknown> {
        order.push("global:before");
        const result = await next();
        order.push("global:after");
        return result;
      }
    }

    @Injectable()
    class ControllerInterceptor implements Interceptor {
      async intercept(
        _context: ExecutionContext,
        next: NextFunction,
      ): Promise<unknown> {
        order.push("controller:before");
        const result = await next();
        order.push("controller:after");
        return result;
      }
    }

    @Injectable()
    class MethodInterceptor implements Interceptor {
      async intercept(
        _context: ExecutionContext,
        next: NextFunction,
      ): Promise<unknown> {
        order.push("method:before");
        const result = await next();
        order.push("method:after");
        return result;
      }
    }

    @UseInterceptors(ControllerInterceptor)
    @Controller("order")
    class OrderController {
      @UseInterceptors(MethodInterceptor)
      @Get()
      test() {
        order.push("handler");
        return { ok: true };
      }
    }

    const { app, base } = await start([OrderController], {
      disableLogging: true,
      globalInterceptors: [GlobalInterceptor],
    });
    after(() => app.close());

    const res = await request(base, "GET", "/order");
    assert.equal(res.status, 200);

    assert.deepEqual(order, [
      "global:before",
      "controller:before",
      "method:before",
      "handler",
      "method:after",
      "controller:after",
      "global:after",
    ]);
  });

  test("guards execute in order: global → controller → method", async () => {
    const order: string[] = [];

    @Injectable()
    class GlobalGuard implements Guard {
      canActivate(_context: ExecutionContext): boolean {
        order.push("global-guard");
        return true;
      }
    }

    @Injectable()
    class ControllerGuard implements Guard {
      canActivate(_context: ExecutionContext): boolean {
        order.push("controller-guard");
        return true;
      }
    }

    @Injectable()
    class MethodGuard implements Guard {
      canActivate(_context: ExecutionContext): boolean {
        order.push("method-guard");
        return true;
      }
    }

    @UseGuards(ControllerGuard)
    @Controller("guard-order")
    class GuardOrderController {
      @UseGuards(MethodGuard)
      @Get()
      test() {
        order.push("handler");
        return { ok: true };
      }
    }

    const { app, base } = await start([GuardOrderController], {
      disableLogging: true,
      globalGuards: [GlobalGuard],
    });
    after(() => app.close());

    const res = await request(base, "GET", "/guard-order");
    assert.equal(res.status, 200);

    assert.deepEqual(order, [
      "global-guard",
      "controller-guard",
      "method-guard",
      "handler",
    ]);
  });
});
