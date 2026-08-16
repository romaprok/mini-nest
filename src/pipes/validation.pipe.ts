import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import type { Constructor } from '../tokens.js';

export interface FieldError {
  field: string;
  constraints: string[];
}

export class ValidationException extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

const PRIMITIVE_TYPES: unknown[] = [String, Number, Boolean, Object, Array, undefined, null];

export class ValidationPipe {
  async transform(value: unknown, metatype: unknown): Promise<unknown> {
    if (!metatype || PRIMITIVE_TYPES.includes(metatype)) {
      return value;
    }

    const instance = plainToInstance(metatype as Constructor, value ?? {});
    const errors = await validate(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });

    if (errors.length > 0) {
      const fieldErrors: FieldError[] = errors.map((err) => ({
        field: err.property,
        constraints: Object.values(err.constraints ?? {}),
      }));
      throw new ValidationException(fieldErrors);
    }

    return instance;
  }
}
