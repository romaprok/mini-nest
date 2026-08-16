import 'reflect-metadata';

import { normalizePath } from './controller.js';

export type HttpMethod = 'GET' | 'POST';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handlerName: string;
}

export const ROUTES_METADATA = Symbol('http:routes');

function createMethodDecorator(method: HttpMethod) {
  return (path = ''): MethodDecorator =>
    (target, propertyKey) => {
      const controller = (target as object).constructor;
      const routes: RouteDefinition[] =
        Reflect.getOwnMetadata(ROUTES_METADATA, controller) ?? [];
      routes.push({
        method,
        path: normalizePath(String(path)),
        handlerName: String(propertyKey),
      });
      Reflect.defineMetadata(ROUTES_METADATA, routes, controller);
    };
}

export const Get = createMethodDecorator('GET');
export const Post = createMethodDecorator('POST');
