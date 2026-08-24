import "reflect-metadata";

import { CONTROLLER_METADATA } from "./decorators/controller.js";
import {
  type HttpMethod,
  type RouteDefinition,
  ROUTES_METADATA,
} from "./decorators/methods.js";
import { type ParamMap, PARAMS_METADATA } from "./decorators/params.js";
import type { Constructor } from "./tokens.js";

export interface CompiledRoute {
  method: HttpMethod;
  fullPath: string;
  segments: string[];
  controller: Constructor;
  handlerName: string;
  params: ParamMap;
  paramTypes: unknown[];
}

export interface MatchResult {
  route: CompiledRoute;
  pathParams: Record<string, string>;
}

export class Router {
  private readonly routes: CompiledRoute[] = [];

  register(controller: Constructor): this {
    const prefix: string =
      Reflect.getMetadata(CONTROLLER_METADATA, controller) ?? "";
    const routes: RouteDefinition[] =
      Reflect.getMetadata(ROUTES_METADATA, controller) ?? [];

    for (const route of routes) {
      const params: ParamMap =
        Reflect.getMetadata(PARAMS_METADATA, controller, route.handlerName) ??
        {};
      const paramTypes: unknown[] =
        Reflect.getMetadata(
          "design:paramtypes",
          controller.prototype,
          route.handlerName,
        ) ?? [];

      const fullPath = `${prefix}${route.path}` || "/";
      this.routes.push({
        method: route.method,
        fullPath,
        segments: splitPath(fullPath),
        controller,
        handlerName: route.handlerName,
        params,
        paramTypes,
      });
    }

    this.sortRoutes();

    return this;
  }

  registerAll(controllers: Constructor[]): this {
    for (const c of controllers) this.register(c);
    return this;
  }

  list(): readonly CompiledRoute[] {
    return this.routes;
  }

  match(method: string, pathname: string): MatchResult | null {
    const reqSegments = splitPath(pathname);

    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== reqSegments.length) continue;

      const pathParams: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(":")) {
          pathParams[seg.slice(1)] = decodeURIComponent(reqSegments[i]);
        } else if (seg !== reqSegments[i]) {
          matched = false;
          break;
        }
      }

      if (matched) return { route, pathParams };
    }
    return null;
  }

  private sortRoutes(): void {
    this.routes.sort((a, b) => {
      const aSpecificity = this.calculateSpecificity(a.segments);
      const bSpecificity = this.calculateSpecificity(b.segments);
      return bSpecificity - aSpecificity; // Higher specificity first
    });
  }

  private calculateSpecificity(segments: string[]): number {
    let score = 0;
    for (const seg of segments) {
      if (seg.startsWith(":")) {
        score += 1;
      } else {
        score += 10;
      }
    }
    return score;
  }
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}
