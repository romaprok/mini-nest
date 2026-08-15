import "reflect-metadata";

import type { Scope } from "../tokens.js";

export const INJECTABLE_METADATA = Symbol("ioc:injectable");

export const SCOPE_METADATA = Symbol("ioc:scope");

export interface InjectableOptions {
  scope?: Scope;
}

export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_METADATA, true, target);
    Reflect.defineMetadata(
      SCOPE_METADATA,
      options.scope ?? "singleton",
      target,
    );
  };
}

export function isInjectable(target: unknown): boolean {
  return (
    typeof target === "function" &&
    Reflect.getMetadata(INJECTABLE_METADATA, target) === true
  );
}

export function getScope(target: object): Scope {
  return (Reflect.getMetadata(SCOPE_METADATA, target) as Scope) ?? "singleton";
}
