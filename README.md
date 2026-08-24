# mini-nest Частина 3: Request Lifecycle

Фінальна частина mini-Nest фреймворку. Це домашнє завдання реалізує повний request lifecycle, який NestJS використовує під капотом.

## Діаграма Request Lifecycle

```
                                         HTTP Request
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE (відкриваючий)                                      │
│                    Налаштування AsyncLocalStorage, лог старту                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         AsyncLocalStorage.run()                                          │
│                    Обгортає весь запит у контекст                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         EXCEPTION FILTER (try/catch)                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                   │  │
│  │  ┌──────────┐    ┌─────────────────┐    ┌────────┐    ┌──────────┐               │  │
│  │  │  GUARDS  │───▶│  INTERCEPTORS   │───▶│ PIPES  │───▶│ HANDLER  │               │  │
│  │  │          │    │    (before)     │    │        │    │          │               │  │
│  │  └──────────┘    └─────────────────┘    └────────┘    └──────────┘               │  │
│  │       │                  │                                  │                     │  │
│  │       │                  │                                  │                     │  │
│  │  throw 401/403/429       │         ┌─────────────────┐      │                     │  │
│  │                          │         │  INTERCEPTORS   │      │                     │  │
│  │                          └────────▶│    (after)      │◀─────┘                     │  │
│  │                                    └─────────────────┘                            │  │
│  │                                                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                           │
│                                         on error                                         │
│                                              │                                           │
│                                              ▼                                           │
│                               ┌───────────────────────┐                                 │
│                               │  Мапінг помилки в HTTP│                                 │
│                               │  401, 403, 404, 500   │                                 │
│                               └───────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                                       HTTP Response
                                    (з X-Request-Id)
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          MIDDLEWARE (закриваючий)                                        │
│                    response.on('finish') — ЗАВЖДИ виконується                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Порядок виконання

**До handler'а:** Global → Controller → Method
**Після handler'а:** Method → Controller → Global

Це модель "цибулини" — ми йдемо від більшого до меншого на вході, і від меншого до більшого на виході.

## Чому AsyncLocalStorage, а не глобальна змінна?

Node.js однопоточний, але обробляє запити **конкурентно** через event loop. Поки один запит чекає на I/O (база даних, мережа), інший запит може виконуватися. Глобальна змінна буде перезаписана другим запитом до того, як перший завершиться.

**Проблема з глобальними змінними (Race Condition):**

```
1. Request A починається, встановлює global.requestId = "aaa"
2. Request A чекає на базу даних
3. Request B починається, встановлює global.requestId = "bbb"  ← перезаписує!
4. Request A продовжується, логує global.requestId → "bbb" (НЕПРАВИЛЬНО!)
```

**AsyncLocalStorage вирішує це:**

```
1. Request A починається в als.run({ requestId: "aaa" }, ...)
2. Request A чекає на базу даних
3. Request B починається в als.run({ requestId: "bbb" }, ...)
4. Request A продовжується, als.getStore().requestId → "aaa" (ПРАВИЛЬНО!)
```

Кожен асинхронний контекст має своє власне сховище. Глибокий код (сервіси, репозиторії, логери) може отримати request-scoped дані без передачі їх через кожен параметр функції.

## Структура проєкту

```
src/
├── middlewares/
│   ├── middleware.interface.ts  # Контракт Middleware
│   └── context.middleware.ts    # AsyncLocalStorage + response.on('finish')
├── guards/
│   ├── guard.interface.ts       # Контракт Guard
│   └── auth.guard.ts            # Перевірка Authorization (false → 403)
├── interceptors/
│   ├── interceptor.interface.ts # Контракт Interceptor
│   └── logging.interceptor.ts   # Вимірювання часу запиту
├── pipes/
│   ├── pipe.interface.ts        # Контракт Pipe
│   └── zod-validation.pipe.ts   # Валідація через Zod 4
├── filters/
│   ├── exception-filter.interface.ts
│   └── exception.filter.ts      # Мапінг помилок → HTTP
├── context/
│   └── request-context.ts       # Обгортка AsyncLocalStorage
├── decorators/
│   ├── use-guards.ts            # Декоратор @UseGuards
│   └── use-interceptors.ts      # Декоратор @UseInterceptors
├── errors/
│   └── http-errors.ts           # NotFoundError, UnauthorizedError, тощо
├── app/
│   ├── user.controller.ts       # Демо контролер
│   └── user.service.ts          # Демо сервіс (використовує ALS)
├── dto/
│   └── create-user.dto.ts       # Zod схема + DTO клас
├── dispatcher.ts                # Повна реалізація lifecycle
└── main.ts                      # Точка входу
```

## Швидкий старт

```bash
# Встановити залежності
npm install

# Запустити тести (потрібен Node.js 20+)
npm test

# Запустити сервер
npm start
```

## Приклади використання

```bash
# Список користувачів (публічний)
curl http://localhost:3000/users

# Отримати користувача за ID
curl http://localhost:3000/users/1

# Неіснуючий користувач (404)
curl http://localhost:3000/users/999

# Створити користувача без авторизації (403 - guard блокує)
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Neo","email":"neo@example.com"}'

# Створити користувача з авторизацією (201)
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer secret-token' \
  -d '{"name":"Neo","email":"neo@example.com"}'

# Створити користувача з невалідними даними (400 - помилка валідації)
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer secret-token' \
  -d '{"name":"N","email":"invalid"}'

# Перевірити заголовок X-Request-Id
curl -si http://localhost:3000/users | grep -i x-request-id

# Надіслати свій X-Request-Id
curl -si -H 'X-Request-Id: my-custom-id' http://localhost:3000/users
```

## Docker

```bash
# Зібрати та запустити
docker compose up --build

# Запустити тести в Docker
docker compose run --rm test

# Або напряму через docker
docker build --target test -t mini-nest:test .
docker run --rm mini-nest:test
```

## Компоненти Lifecycle

### Middleware

Виконується **першим**, перед усім іншим. Має "відкриваючу" та "закриваючу" частини:

```typescript
@Injectable()
export class ContextMiddleware implements Middleware {
  use(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => void,
  ): void {
    const store = createRequestStore(req);

    // ЗАКРИВАЮЧИЙ: response.on('finish') ЗАВЖДИ виконується, навіть при помилках
    res.on("finish", () => {
      console.log(`[${store.requestId}] ← ${res.statusCode}`);
    });

    // ВІДКРИВАЮЧИЙ: обгортаємо все в AsyncLocalStorage
    runWithRequestContext(store, () => next());
  }
}
```

**Важливо:** `response.on('finish')` виконується навіть коли interceptor:after не виконується (при помилках).

### Guard

Виконується **до** handler'а та **до** валідації. Повертає `boolean`: `false` → 403 Forbidden, handler не викликається.

```typescript
@Injectable()
export class AuthGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const authHeader = context.request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false; // → 403 Forbidden, handler не викликається
    }

    return true;
  }
}
```

### Interceptor

Обгортає виконання handler'а. Код виконується **до** та **після**:

```typescript
@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(
    context: ExecutionContext,
    next: NextFunction,
  ): Promise<unknown> {
    const start = performance.now();
    const result = await next(); // ← тут виконується handler
    const duration = performance.now() - start;
    console.log(
      `${context.method} ${context.path} — ${duration.toFixed(1)} ms`,
    );
    return result;
  }
}
```

**Примітка:** Interceptor:after НЕ виконується якщо кинута помилка!

### Pipe

Трансформує/валідує один аргумент **до** того, як він потрапить в handler:

```typescript
@Injectable()
export class ZodValidationPipe implements Pipe {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = getZodSchema(metadata.metatype);
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(result.error.issues);
    }
    return result.data;
  }
}
```

### Exception Filter

Ловить помилки з будь-якого етапу lifecycle та мапить їх на HTTP відповіді:

| Тип помилки            | HTTP статус                |
| ---------------------- | -------------------------- |
| `UnauthorizedError`    | 401                        |
| `ForbiddenError`       | 403                        |
| `NotFoundError`        | 404                        |
| `TooManyRequestsError` | 429                        |
| `ValidationError`      | 400 + список помилок полів |
| Невідома               | 500 (без stack trace)      |

## Таблиця порівняння

| Аспект         | Middleware    | Guard            | Interceptor      | Pipe          |
| -------------- | ------------- | ---------------- | ---------------- | ------------- |
| Коли           | Перший        | До handler'а     | До + після       | До handler'а  |
| Бачить         | req/res       | ExecutionContext | ExecutionContext | Один аргумент |
| Робить         | Setup/cleanup | Дозволяє/блокує  | Обгортає виклик  | Трансформує   |
| Повертає       | void          | boolean          | Результат        | Значення      |
| Знає контролер | Ні            | Так              | Так              | Так           |
| Use case       | ALS, CORS     | Auth             | Logging          | Validation    |

## Технології

- **Node.js 20+** з нативним ESM
- **TypeScript 5** з декораторами
- **Zod 4** для валідації (не class-validator)
- **AsyncLocalStorage** для request context
- **reflect-metadata** для метаданих декораторів
- **node:test** для тестування
- **Docker** multi-stage build

## Без фреймворків

Цей проєкт навмисно уникає веб-фреймворків:

```bash
grep -RE "@nestjs|express|fastify" package.json src/
# (немає збігів)
```

Все побудовано на `node:http` щоб зрозуміти, як NestJS працює всередині.
