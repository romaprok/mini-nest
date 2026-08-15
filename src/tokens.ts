export type Constructor<T = unknown> = new (...args: any[]) => T;

export type Token<T = unknown> = string | symbol | Constructor<T>;

export type Scope = "singleton" | "transient";

export function createToken<T = unknown>(description: string): Token<T> {
  return Symbol.for(description);
}

export function tokenName(token: Token): string {
  if (typeof token === "function") return token.name || "AnonymousClass";
  if (typeof token === "symbol") return token.description ?? token.toString();
  return String(token);
}
