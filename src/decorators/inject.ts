import "reflect-metadata";

import type { Token } from "../tokens.js";

export const INJECT_TOKENS_METADATA = Symbol("ioc:inject-tokens");

export type InjectTokenMap = Record<number, Token>;

export function Inject(token: Token): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const existing: InjectTokenMap =
      Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? {};
    existing[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_TOKENS_METADATA, existing, target);
  };
}

export function getInjectTokens(target: object): InjectTokenMap {
  return Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? {};
}
