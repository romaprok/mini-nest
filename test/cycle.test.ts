import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CircularDependencyError,
  Container,
  Inject,
  Injectable,
} from "../src/index.js";

const A_TOKEN = Symbol.for("A");
const B_TOKEN = Symbol.for("B");

test("a cyclic graph throws a clear error naming the whole chain", () => {
  @Injectable()
  class A {
    constructor(@Inject(B_TOKEN) readonly b: unknown) {}
  }

  @Injectable()
  class B {
    constructor(@Inject(A_TOKEN) readonly a: unknown) {}
  }

  const container = new Container();
  container.register(A, A_TOKEN);
  container.register(B, B_TOKEN);

  assert.throws(
    () => container.resolve(A_TOKEN),
    (err: unknown) => {
      assert.ok(
        err instanceof CircularDependencyError,
        "is a CircularDependencyError",
      );
      assert.ok(
        !(err instanceof RangeError),
        "is NOT a RangeError (stack overflow)",
      );
      assert.match(
        (err as Error).message,
        /A -> B -> A/,
        "message names the full chain",
      );
      return true;
    },
  );
});

test("the cycle error is not a RangeError / Maximum call stack", () => {
  @Injectable()
  class A {
    constructor(@Inject(B_TOKEN) readonly b: unknown) {}
  }

  @Injectable()
  class B {
    constructor(@Inject(A_TOKEN) readonly a: unknown) {}
  }

  const container = new Container();
  container.register(A, A_TOKEN);
  container.register(B, B_TOKEN);

  let caught: unknown;
  try {
    container.resolve(A_TOKEN);
  } catch (err) {
    caught = err;
  }

  assert.ok(caught instanceof CircularDependencyError);
  assert.doesNotMatch((caught as Error).message, /Maximum call stack/);
});
