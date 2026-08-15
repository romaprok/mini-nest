import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Container } from '../src/index.js';
import { Injectable } from '../src/index.js';

test('resolves a class with no dependencies', () => {
  @Injectable()
  class Logger {
    log(msg: string): string {
      return `log: ${msg}`;
    }
  }

  const container = new Container();
  const logger = container.resolve(Logger);

  assert.ok(logger instanceof Logger);
  assert.equal(logger.log('hi'), 'log: hi');
});

test('builds the graph recursively with a live leaf (A -> B -> C)', () => {
  @Injectable()
  class C {
    readonly value = 'leaf';
  }

  @Injectable()
  class B {
    constructor(readonly c: C) {}
  }

  @Injectable()
  class A {
    constructor(readonly b: B) {}
  }

  const container = new Container();
  const a = container.resolve(A);

  assert.ok(a instanceof A);
  assert.ok(a.b instanceof B, 'B was constructed and injected into A');
  assert.ok(a.b.c instanceof C, 'C was constructed and injected into B');
  assert.equal(a.b.c.value, 'leaf', 'the deep C instance is live and usable');
});
