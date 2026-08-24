import "reflect-metadata";

import { getScope, isInjectable } from "./decorators/injectable.js";
import { getInjectTokens } from "./decorators/inject.js";
import {
  type Constructor,
  type Scope,
  type Token,
  tokenName,
} from "./tokens.js";

export class CircularDependencyError extends Error {
  constructor(public readonly chain: string) {
    super(`Circular dependency detected: ${chain}`);
    this.name = "CircularDependencyError";
  }
}

export class UnknownProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownProviderError";
  }
}

type ProviderRecord =
  | { kind: "value"; value: unknown }
  | { kind: "class"; useClass: Constructor; scope: Scope };

export class Container {
  private readonly providers = new Map<Token, ProviderRecord>();
  private readonly singletons = new Map<Token, unknown>();

  register<T>(useClass: Constructor<T>, token: Token<T> = useClass): this {
    this.providers.set(token, {
      kind: "class",
      useClass,
      scope: getScope(useClass),
    });
    return this;
  }

  registerValue<T>(token: Token<T>, value: T): this {
    this.providers.set(token, { kind: "value", value });
    return this;
  }

  resolve<T>(token: Token<T>): T {
    return this.resolveInternal(token, []) as T;
  }

  private resolveInternal(token: Token, path: Token[]): unknown {
    const record = this.getRecord(token);

    if (record.kind === "value") {
      return record.value;
    }

    if (record.scope === "singleton" && this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    if (path.includes(token)) {
      const chain = [...path, token].map(tokenName).join(" -> ");
      throw new CircularDependencyError(chain);
    }

    const nextPath = [...path, token];
    const instance = this.instantiate(record.useClass, nextPath);

    if (record.scope === "singleton") {
      this.singletons.set(token, instance);
    }
    return instance;
  }

  private instantiate(target: Constructor, path: Token[]): unknown {
    const paramTypes = Reflect.getOwnMetadata("design:paramtypes", target) as
      | unknown[]
      | undefined;
    const injectTokens = getInjectTokens(target);

    if (!paramTypes) {
      if (target.length > 0 && !isInjectable(target)) {
        throw new UnknownProviderError(
          `Cannot read constructor metadata for "${target.name}". ` +
            `Add @Injectable() to it and make sure "emitDecoratorMetadata" is enabled.`,
        );
      }
      return new target();
    }

    const args = paramTypes.map((paramType, index) => {
      const token = (injectTokens[index] ?? paramType) as Token | undefined;

      if (token == null || token === Object) {
        throw new UnknownProviderError(
          `Cannot resolve parameter #${index} of "${target.name}": its type ` +
            `is not a usable token (interface or primitive?). Use @Inject(token).`,
        );
      }

      return this.resolveInternal(token, path);
    });

    return new target(...args);
  }

  private getRecord(token: Token): ProviderRecord {
    const existing = this.providers.get(token);
    if (existing) return existing;

    if (typeof token === "function") {
      const record: ProviderRecord = {
        kind: "class",
        useClass: token as Constructor,
        scope: getScope(token),
      };
      this.providers.set(token, record);
      return record;
    }

    throw new UnknownProviderError(
      `No provider registered for token "${tokenName(token)}".`,
    );
  }
}
