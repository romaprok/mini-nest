import 'reflect-metadata';

import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { Controller, Get, Injectable } from '../src/index.js';
import { request, start } from './helpers.js';

@Injectable()
class CounterService {
  private count = 0;
  hit(): number {
    return ++this.count;
  }
}

@Controller('counter')
class CounterController {
  constructor(readonly service: CounterService) {}

  @Get()
  ping() {
    return { count: this.service.hit() };
  }
}

test('controller receives its service via the container (same singleton)', async () => {
  const { app, base } = await start([CounterController]);
  after(() => app.close());

  await request(base, 'GET', '/counter');

  const controller = app.container.resolve(CounterController);
  const service = app.container.resolve(CounterService);

  assert.equal(
    controller.service,
    service,
    'the service injected into the controller is the very same container singleton',
  );
});

test('singleton service keeps state across requests', async () => {
  const { app, base } = await start([CounterController]);
  after(() => app.close());

  const first = await request(base, 'GET', '/counter');
  const second = await request(base, 'GET', '/counter');

  assert.equal((first.body as { count: number }).count, 1);
  assert.equal((second.body as { count: number }).count, 2, 'state persisted => one instance');
});
