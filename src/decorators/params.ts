import "reflect-metadata";

export type ParamType = "body" | "param" | "query";

export interface ParamDefinition {
  type: ParamType;
  name?: string;
}

export type ParamMap = Record<number, ParamDefinition>;

export const PARAMS_METADATA = Symbol("http:params");

function defineParam(type: ParamType, name?: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const controller = (target as object).constructor;
    const existing: ParamMap =
      Reflect.getOwnMetadata(PARAMS_METADATA, controller, propertyKey!) ?? {};
    existing[parameterIndex] = { type, name };
    Reflect.defineMetadata(PARAMS_METADATA, existing, controller, propertyKey!);
  };
}

export function Body(): ParameterDecorator {
  return defineParam("body");
}

export function Param(name: string): ParameterDecorator {
  return defineParam("param", name);
}

export function Query(name: string): ParameterDecorator {
  return defineParam("query", name);
}
