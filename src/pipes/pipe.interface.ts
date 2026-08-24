export interface ArgumentMetadata {
  type: "body" | "param" | "query";
  metatype?: unknown;
  name?: string;
}

export interface Pipe {
  /**
   * Transform or validate the value.
   * @param value - The raw value from the request
   * @param metadata - Information about the parameter
   * @returns The transformed value (or throws on validation failure)
   */
  transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): unknown | Promise<unknown>;
}
