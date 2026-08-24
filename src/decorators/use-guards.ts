import "reflect-metadata";

import type { Guard } from "../guards/guard.interface.js";
import type { Constructor } from "../tokens.js";

export const GUARDS_METADATA = Symbol("http:guards");

export function UseGuards(
  ...guards: Constructor<Guard>[]
): ClassDecorator & MethodDecorator {
  return (
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined) {
      const controller = (target as object).constructor;
      const existing: Constructor<Guard>[] =
        Reflect.getOwnMetadata(GUARDS_METADATA, controller, propertyKey) ?? [];
      Reflect.defineMetadata(
        GUARDS_METADATA,
        [...existing, ...guards],
        controller,
        propertyKey,
      );
    } else {
      const existing: Constructor<Guard>[] =
        Reflect.getOwnMetadata(GUARDS_METADATA, target) ?? [];
      Reflect.defineMetadata(GUARDS_METADATA, [...existing, ...guards], target);
    }
  };
}

export function getControllerGuards(
  controller: Constructor,
): Constructor<Guard>[] {
  return Reflect.getOwnMetadata(GUARDS_METADATA, controller) ?? [];
}

export function getMethodGuards(
  controller: Constructor,
  methodName: string,
): Constructor<Guard>[] {
  return Reflect.getOwnMetadata(GUARDS_METADATA, controller, methodName) ?? [];
}
