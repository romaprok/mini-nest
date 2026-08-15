import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Container, Inject, Injectable } from "../src/index.js";

interface AppConfig {
  databaseUrl: string;
}

const CONFIG = Symbol.for("CONFIG");

test("@Inject(token) resolves a value registered under a symbol token", () => {
  @Injectable()
  class UserRepo {
    constructor(@Inject(CONFIG) readonly config: AppConfig) {}
  }

  const container = new Container();
  container.registerValue<AppConfig>(CONFIG, {
    databaseUrl: "postgres://app:app@postgres:5432/app",
  });

  const repo = container.resolve(UserRepo);

  assert.equal(repo.config.databaseUrl, "postgres://app:app@postgres:5432/app");
});

test("the dependency is chosen by token, not by the (erased) parameter type", () => {
  const PRIMARY = Symbol.for("PRIMARY_DB");
  const REPLICA = Symbol.for("REPLICA_DB");

  @Injectable()
  class Service {
    constructor(
      @Inject(PRIMARY) readonly primary: AppConfig,
      @Inject(REPLICA) readonly replica: AppConfig,
    ) {}
  }

  const container = new Container();
  container.registerValue<AppConfig>(PRIMARY, { databaseUrl: "primary" });
  container.registerValue<AppConfig>(REPLICA, { databaseUrl: "replica" });

  const service = container.resolve(Service);

  assert.equal(service.primary.databaseUrl, "primary");
  assert.equal(service.replica.databaseUrl, "replica");
});
