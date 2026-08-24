import { Controller } from "../decorators/controller.js";
import { Get, Post } from "../decorators/methods.js";
import { Body, Param, Query } from "../decorators/params.js";
import { UseGuards } from "../decorators/use-guards.js";
import { AuthGuard } from "../guards/auth.guard.js";
import { CreateUserDto } from "../dto/create-user.dto.js";
import { UserService } from "./user.service.js";

@Controller("users")
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    const parsed = limit === undefined ? undefined : Number(limit);
    return this.users.findAll(parsed);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.users.findOne(Number(id));
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }
}
