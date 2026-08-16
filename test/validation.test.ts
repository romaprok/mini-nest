import 'reflect-metadata';

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { Body, Controller, Post } from '../src/index.js';
import { CreateUserDto } from '../src/dto/create-user.dto.js';
import { request, start } from './helpers.js';

@Controller('users')
class RecordingController {
  lastBody: unknown = undefined;

  @Post()
  create(@Body() dto: CreateUserDto) {
    this.lastBody = dto;
    return dto;
  }
}

test('invalid body -> 400 listing the offending field (email)', async () => {
  const { app, base } = await start([RecordingController]);
  after(() => app.close());

  const res = await request(base, 'POST', '/users', {
    name: 'x', // too short (MinLength 2)
    email: 'not-an-email',
  });

  assert.equal(res.status, 400);
  assert.match(res.text, /email/, 'response names the invalid field');
  const errors = (res.body as { errors: { field: string }[] }).errors;
  assert.ok(Array.isArray(errors), 'errors is a list, not just the first field');
  assert.ok(errors.some((e) => e.field === 'email'));
});

test('valid body -> 201 and the handler receives a CreateUserDto instance', async () => {
  const { app, base } = await start([RecordingController]);
  after(() => app.close());

  const res = await request(base, 'POST', '/users', {
    name: 'Grace',
    email: 'grace@example.com',
    age: 30,
  });

  assert.equal(res.status, 201);

  const controller = app.container.resolve(RecordingController);
  assert.ok(
    controller.lastBody instanceof CreateUserDto,
    'handler got an instance of CreateUserDto, not a plain object',
  );
});

test('malformed JSON body -> 400', async () => {
  const { app, base } = await start([RecordingController]);
  after(() => app.close());

  const res = await fetch(base + '/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ not json ',
  });

  assert.equal(res.status, 400);
});
