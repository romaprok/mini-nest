import { Injectable } from "../decorators/injectable.js";
import type { ExecutionContext, Guard } from "./guard.interface.js";

@Injectable()
export class AuthGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const authHeader = context.request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.slice(7);
    if (!token || token.length === 0) {
      return false;
    }

    return true;
  }
}
