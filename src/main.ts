import 'reflect-metadata';

import { UserController } from './app/user.controller.js';
import { createApplication } from './factory.js';

const app = createApplication([UserController]);
const port = Number(process.env.PORT) || 3000;

app.listen(port).then((addr) => {
  console.log(`mini-nest listening on http://localhost:${addr.port}`);
  console.log('Try:');
  console.log(`  curl http://localhost:${addr.port}/users`);
  console.log(`  curl http://localhost:${addr.port}/users/1`);
  console.log(`  curl "http://localhost:${addr.port}/users?limit=2"`);
  console.log(
    `  curl -X POST http://localhost:${addr.port}/users ` +
      `-H 'content-type: application/json' -d '{"name":"Neo","email":"neo@example.com"}'`,
  );
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0));
  });
}
