import "reflect-metadata";

export const CONTROLLER_METADATA = Symbol("http:controller");

export function normalizePath(path: string): string {
  if (!path) return "";
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export function Controller(prefix = ""): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(CONTROLLER_METADATA, normalizePath(prefix), target);
  };
}
