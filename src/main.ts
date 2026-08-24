import "reflect-metadata";

import { UserController } from "./app/user.controller.js";
import { createApplication } from "./factory.js";

const app = createApplication([UserController]);
const port = Number(process.env.PORT) || 3000;

app.listen(port).then((addr) => {
  console.log(`mini-nest listening on http://localhost:${addr.port}`);
  console.log("");
  console.log("Try these commands:");
  console.log("");
  console.log("  # List all users (public)");
  console.log(`  curl http://localhost:${addr.port}/users`);
  console.log("");
  console.log("  # Get user by ID (public)");
  console.log(`  curl http://localhost:${addr.port}/users/1`);
  console.log("");
  console.log("  # Get non-existent user (404)");
  console.log(`  curl http://localhost:${addr.port}/users/999`);
  console.log("");
  console.log("  # Create user without auth (401)");
  console.log(`  curl -X POST http://localhost:${addr.port}/users \\`);
  console.log(`    -H 'content-type: application/json' \\`);
  console.log(`    -d '{"name":"Neo","email":"neo@example.com"}'`);
  console.log("");
  console.log("  # Create user with auth (201)");
  console.log(`  curl -X POST http://localhost:${addr.port}/users \\`);
  console.log(`    -H 'content-type: application/json' \\`);
  console.log(`    -H 'Authorization: Bearer secret-token' \\`);
  console.log(`    -d '{"name":"Neo","email":"neo@example.com"}'`);
  console.log("");
  console.log("  # Create user with invalid data (400)");
  console.log(`  curl -X POST http://localhost:${addr.port}/users \\`);
  console.log(`    -H 'content-type: application/json' \\`);
  console.log(`    -H 'Authorization: Bearer secret-token' \\`);
  console.log(`    -d '{"name":"N","email":"invalid"}'`);
  console.log("");
  console.log("  # Check X-Request-Id header");
  console.log(
    `  curl -si http://localhost:${addr.port}/users | grep -i x-request-id`,
  );
  console.log("");
  console.log("  # Send custom X-Request-Id");
  console.log(
    `  curl -si -H 'X-Request-Id: my-custom-id' http://localhost:${addr.port}/users | grep -i x-request-id`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0));
  });
}
