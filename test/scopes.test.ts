import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Container, Injectable } from '../src/index.js';

test('singleton (default scope) returns the same instance', () => {
  @Injectable()
  class Service {}

  const container = new Container();

  assert.equal(
    container.resolve(Service),
    container.resolve(Service),
    'two resolves of a default-scoped class must be identical',
  );
});

test('a singleton dependency is shared between consumers', () => {
  @Injectable()
  class Shared {}

  @Injectable()
  class ConsumerA {
    constructor(readonly shared: Shared) {}
  }

  @Injectable()
  class ConsumerB {
    constructor(readonly shared: Shared) {}
  }

  const container = new Container();
  const a = container.resolve(ConsumerA);
  const b = container.resolve(ConsumerB);

  assert.equal(a.shared, b.shared, 'both consumers get the very same Shared');
});

test('transient scope returns a new instance on every resolve', () => {
  @Injectable({ scope: 'transient' })
  class Service {}

  const container = new Container();

  assert.notEqual(
    container.resolve(Service),
    container.resolve(Service),
    'a transient class must produce a fresh instance each time',
  );
});
