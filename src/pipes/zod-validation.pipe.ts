import { z } from "zod";

import { Injectable } from "../decorators/injectable.js";
import { ValidationError } from "../errors/http-errors.js";
import type { ArgumentMetadata, Pipe } from "./pipe.interface.js";

export const ZOD_SCHEMA_METADATA = Symbol("zod:schema");

export function ZodSchema(schema: z.ZodType): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ZOD_SCHEMA_METADATA, schema, target);
  };
}

export function getZodSchema(target: unknown): z.ZodType | undefined {
  if (typeof target !== "function") return undefined;
  return Reflect.getMetadata(ZOD_SCHEMA_METADATA, target);
}

const PRIMITIVE_TYPES: unknown[] = [
  String,
  Number,
  Boolean,
  Object,
  Array,
  undefined,
  null,
];

@Injectable()
export class ZodValidationPipe implements Pipe {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== "body" || !metadata.metatype) {
      return value;
    }

    if (PRIMITIVE_TYPES.includes(metadata.metatype)) {
      return value;
    }

    const schema = getZodSchema(metadata.metatype);
    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
      }));
      throw new ValidationError(fieldErrors);
    }

    return result.data;
  }
}
