import { Injectable } from "../decorators/injectable.js";
import { getRequestId } from "../context/request-context.js";
import { NotFoundError } from "../errors/http-errors.js";
import type { CreateUserDto } from "../dto/create-user.dto.js";

export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

@Injectable()
export class UserService {
  private readonly users: User[] = [
    { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
    { id: 2, name: "Alan Turing", email: "alan@example.com" },
    { id: 3, name: "Grace Hopper", email: "grace@example.com" },
  ];
  private nextId = 4;

  findAll(limit?: number): User[] {
    const requestId = getRequestId();
    console.log(`[${requestId}] UserService.findAll(limit=${limit})`);

    return typeof limit === "number" ? this.users.slice(0, limit) : this.users;
  }

  findOne(id: number): User {
    const requestId = getRequestId();
    console.log(`[${requestId}] UserService.findOne(id=${id})`);

    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  }

  create(dto: CreateUserDto): User {
    const requestId = getRequestId();
    console.log(`[${requestId}] UserService.create(name=${dto.name})`);

    const user: User = { id: this.nextId++, ...dto };
    this.users.push(user);
    return user;
  }
}
