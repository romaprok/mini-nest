import 'reflect-metadata';

import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import { UserController } from '../src/app/user.controller.js';
import { request, start } from './helpers.js';

describe('Validation (Zod pipe)', () => {
  test('valid body passes validation', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(
      base,
      'POST',
      '/users',
      { name: 'Valid User', email: 'valid@example.com' },
      { Authorization: 'Bearer token' },
    );

    assert.equal(res.status, 201);
    assert.equal((res.body as { name: string }).name, 'Valid User');
  });

  test('invalid email returns 400 with field errors', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(
      base,
      'POST',
      '/users',
      { name: 'Test', email: 'not-an-email' },
      { Authorization: 'Bearer token' },
    );

    assert.equal(res.status, 400);
    assert.ok((res.body as { errors: unknown[] }).errors, 'Should have errors array');

    const errors = (res.body as { errors: Array<{ field: string }> }).errors;
    const emailError = errors.find((e) => e.field === 'email');
    assert.ok(emailError, 'Should have email field error');
  });

  test('name too short returns 400 with field errors', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(
      base,
      'POST',
      '/users',
      { name: 'A', email: 'valid@example.com' },
      { Authorization: 'Bearer token' },
    );

    assert.equal(res.status, 400);

    const errors = (res.body as { errors: Array<{ field: string }> }).errors;
    const nameError = errors.find((e) => e.field === 'name');
    assert.ok(nameError, 'Should have name field error');
  });

  test('multiple validation errors returned together', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(
      base,
      'POST',
      '/users',
      { name: 'A', email: 'bad' },
      { Authorization: 'Bearer token' },
    );

    assert.equal(res.status, 400);

    const errors = (res.body as { errors: Array<{ field: string }> }).errors;
    assert.ok(errors.length >= 2, 'Should have multiple errors');
  });

  test('optional age field with invalid type returns 400', async () => {
    const { app, base } = await start([UserController], { disableLogging: true });
    after(() => app.close());

    const res = await request(
      base,
      'POST',
      '/users',
      { name: 'Test', email: 'test@example.com', age: 'not-a-number' },
      { Authorization: 'Bearer token' },
    );

    assert.equal(res.status, 400);
  });
});
