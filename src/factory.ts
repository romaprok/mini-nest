import 'reflect-metadata';

import type { AddressInfo } from 'node:net';
import type http from 'node:http';

import { Container } from './container.js';
import { Dispatcher } from './dispatcher.js';
import { Router } from './router.js';
import { ValidationPipe } from './pipes/validation.pipe.js';
import type { Constructor } from './tokens.js';

export interface Application {
  server: http.Server;
  container: Container;
  router: Router;
  dispatcher: Dispatcher;
  listen(port?: number): Promise<AddressInfo>;
  close(): Promise<void>;
}

export interface CreateApplicationOptions {
  configure?: (container: Container) => void;
}

export function createApplication(
  controllers: Constructor[],
  options: CreateApplicationOptions = {},
): Application {
  const container = new Container();
  options.configure?.(container);

  const router = new Router().registerAll(controllers);
  const dispatcher = new Dispatcher({
    container,
    router,
    validationPipe: new ValidationPipe(),
  });
  const server = dispatcher.createServer();

  return {
    server,
    container,
    router,
    dispatcher,
    listen(port = 0) {
      return new Promise<AddressInfo>((resolve) => {
        server.listen(port, () => resolve(server.address() as AddressInfo));
      });
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
