import 'reflect-metadata';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Controller, Get, Param, Post, Router } from '../src/index.js';

@Controller('users')
class DemoController {
  @Get(':id')
  getOne(@Param('id') _id: string) {
    return null;
  }

  @Post()
  create() {
    return null;
  }
}

test('router builds full paths from prefix + method path (no hard-coded list)', () => {
  const router = new Router().register(DemoController);
  const routes = router.list();

  const paths = routes.map((r) => `${r.method} ${r.fullPath}`).sort();
  assert.deepEqual(paths, ['GET /users/:id', 'POST /users']);
});

test('router matches a concrete request and captures path params', () => {
  const router = new Router().register(DemoController);

  const matched = router.match('GET', '/users/42');
  assert.ok(matched, 'route matched');
  assert.equal(matched!.pathParams.id, '42');
});

test('param decorators run before the method decorator (metadata is attached)', () => {
  const router = new Router().register(DemoController);
  const getOne = router.list().find((r) => r.handlerName === 'getOne');

  assert.ok(getOne);
  assert.deepEqual(getOne!.params[0], { type: 'param', name: 'id' });
});
