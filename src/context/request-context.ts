import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestStore {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestStore>();

export function runWithRequestContext<T>(
  store: RequestStore,
  callback: () => T,
): T {
  return asyncLocalStorage.run(store, callback);
}

export function getRequestContext(): RequestStore | undefined {
  return asyncLocalStorage.getStore();
}

export function getRequestId(): string {
  const store = asyncLocalStorage.getStore();
  if (!store) {
    throw new Error(
      "getRequestId() called outside of request context. " +
        "Make sure the request is wrapped in runWithRequestContext().",
    );
  }
  return store.requestId;
}

export function createRequestStore(
  method: string,
  path: string,
  clientRequestId?: string | null,
): RequestStore {
  return {
    requestId: clientRequestId || randomUUID(),
    method,
    path,
    startTime: performance.now(),
  };
}
