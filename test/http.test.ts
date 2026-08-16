import 'reflect-metadata';

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { UserController } from '../src/app/user.controller.js';
import { request, start } from './helpers.js';

test('prefix + method path concatenate: GET /users/42 hits the route', async () => {
  const { app, base } = await start([UserController]);
  after(() => app.close());

  const res = await request(base, 'GET', '/users/42');

  assert.equal(res.status, 200);
  assert.match(res.text, /42/);
});

test('@Param is passed as an argument, not read from req', async () => {
  const { app, base } = await start([UserController]);
  after(() => app.close());

  const res = await request(base, 'GET', '/users/1');

  assert.equal(res.status, 200);
  assert.equal((res.body as { id: number }).id, 1);
  assert.equal((res.body as { name: string }).name, 'Ada Lovelace');
});

test('@Query value reaches the handler as its own argument', async () => {
  const { app, base } = await start([UserController]);
  after(() => app.close());

  const res = await request(base, 'GET', '/users?limit=2');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal((res.body as unknown[]).length, 2, 'limit=2 truncated the list');
});

test('@Body delivers the parsed JSON object to the handler', async () => {
  const { app, base } = await start([UserController]);
  after(() => app.close());

  const res = await request(base, 'POST', '/users', {
    name: 'Neo',
    email: 'neo@example.com',
  });

  assert.equal(res.status, 201);
  assert.equal((res.body as { name: string }).name, 'Neo');
  assert.equal((res.body as { email: string }).email, 'neo@example.com');
  assert.ok(typeof (res.body as { id: number }).id === 'number');
});

test('unknown route returns 404', async () => {
  const { app, base } = await start([UserController]);
  after(() => app.close());

  const res = await request(base, 'GET', '/nope');

  assert.equal(res.status, 404);
});
