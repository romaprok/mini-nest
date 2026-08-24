import { z } from "zod";
import { ZodSchema } from "../pipes/zod-validation.pipe.js";

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(0, "Age must be non-negative").optional(),
});

@ZodSchema(CreateUserSchema)
export class CreateUserDto {
  name!: string;
  email!: string;
  age?: number;
}

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
