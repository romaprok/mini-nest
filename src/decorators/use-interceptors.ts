import "reflect-metadata";

import type { Interceptor } from "../interceptors/interceptor.interface.js";
import type { Constructor } from "../tokens.js";

export const INTERCEPTORS_METADATA = Symbol("http:interceptors");

export function UseInterceptors(
  ...interceptors: Constructor<Interceptor>[]
): ClassDecorator & MethodDecorator {
  return (
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined) {
      const controller = (target as object).constructor;
      const existing: Constructor<Interceptor>[] =
        Reflect.getOwnMetadata(
          INTERCEPTORS_METADATA,
          controller,
          propertyKey,
        ) ?? [];
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA,
        [...existing, ...interceptors],
        controller,
        propertyKey,
      );
    } else {
      const existing: Constructor<Interceptor>[] =
        Reflect.getOwnMetadata(INTERCEPTORS_METADATA, target) ?? [];
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA,
        [...existing, ...interceptors],
        target,
      );
    }
  };
}

export function getControllerInterceptors(
  controller: Constructor,
): Constructor<Interceptor>[] {
  return Reflect.getOwnMetadata(INTERCEPTORS_METADATA, controller) ?? [];
}

export function getMethodInterceptors(
  controller: Constructor,
  methodName: string,
): Constructor<Interceptor>[] {
  return (
    Reflect.getOwnMetadata(INTERCEPTORS_METADATA, controller, methodName) ?? []
  );
}
