import 'reflect-metadata';

import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { UserController } from '../src/app/user.controller.js';
import { request, start } from './helpers.js';

describe('HTTP routing', () => {
  test('GET /users returns list of users', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(base, 'GET', '/users');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok((res.body as unknown[]).length >= 3);
  });

  test('GET /users/:id returns specific user', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(base, 'GET', '/users/1');

    assert.equal(res.status, 200);
    assert.equal((res.body as { id: number }).id, 1);
    assert.equal((res.body as { name: string }).name, 'Ada Lovelace');
  });

  test('GET /users/:id with non-existent id returns 404', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(base, 'GET', '/users/999');

    assert.equal(res.status, 404);
    assert.match((res.body as { message: string }).message, /not found/i);
  });

  test('GET /users?limit=2 respects limit parameter', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(base, 'GET', '/users?limit=2');

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal((res.body as unknown[]).length, 2);
  });

  test('unknown route returns 404', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(base, 'GET', '/nonexistent');

    assert.equal(res.status, 404);
  });
});
