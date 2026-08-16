# mini-nest — частина 2: маршрутизація на декораторах + валідація

Продовження mini-Nest. Тепер контейнер не просто створює об'єкти, а
обслуговує HTTP-запити: маршрути описуються декораторами, а вхідні дані
валідуються через DTO. Усе — поверх `node:http`, **без Express/Fastify/Nest**.

**частина 2 з 3**:

- **Частина 2 (тут):** `@Controller`, `@Get`/`@Post`, `@Body`/`@Param`/`@Query`,
  роутер, диспетчер над `node:http`, `ValidationPipe` + DTO.

## Структура

```
├─ src/
│  ├─ decorators/
│  │  ├─ injectable.ts   # (ч.1) @Injectable
│  │  ├─ inject.ts        # (ч.1) @Inject(token)
│  │  ├─ controller.ts    # @Controller(prefix)
│  │  ├─ methods.ts       # @Get / @Post
│  │  └─ params.ts        # @Body / @Param / @Query
│  ├─ dto/
│  │  └─ create-user.dto.ts     # DTO з правилами (class-validator)
│  ├─ pipes/
│  │  └─ validation.pipe.ts     # plainToInstance + validate → 400
│  ├─ app/
│  │  ├─ user.service.ts        # демо-сервіс (singleton)
│  │  └─ user.controller.ts     # демо-контролер
│  ├─ container.ts       # (ч.1) IoC-контейнер
│  ├─ tokens.ts           # (ч.1) типи Token/Constructor/Scope
│  ├─ router.ts           # збір маршрутів із метаданих + матчинг
│  ├─ dispatcher.ts       # HTTP-шар поверх node:http
│  ├─ factory.ts          # createApplication(controllers) — аналог NestFactory
│  ├─ index.ts            # публічний реекспорт
│  └─ main.ts             # runnable demo (npm start)
├─ test/                  # node:test (HTTP через вбудований fetch)
│  ├─ http.test.ts        # префікс, @Param, @Query, @Body, 404
│  ├─ validation.test.ts  # 400 зі списком полів; 201 + instanceof DTO
│  ├─ container.test.ts   # той самий singleton інжектиться в контролер
│  ├─ router.test.ts      # склейка префікса, матчинг, порядок декораторів
│  └─ helpers.ts          # старт застосунку на випадковому порту + fetch
├─ tsconfig.json          # experimentalDecorators + emitDecoratorMetadata
├─ package.json           # reflect-metadata, class-validator, class-transformer
├─ README.md              # цей файл
```

## Швидкий старт

- `npm install`
- `npm test` — tsc → node:test; очікується 13 passed / 0 failed (мінімум 6)
- `npm start` — підняти демо-сервер на :3000

## Приклади запитів

> ⚠️ Спочатку запустіть сервер: `npm start` — він слухає на `:3000`.
> Без цього curl отримає "Connection refused".

```bash
curl http://localhost:3000/users            # список
```

```bash
curl http://localhost:3000/users/1          # @Param('id')
```

```bash
curl "http://localhost:3000/users?limit=2"  # @Query('limit')
```

```bash
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Neo","email":"neo@example.com"}'      # @Body() + валідація
```

## Як параметр-декоратор знає, куди підставити значення

Ключова ідея: **параметр-декоратор нічого не читає із запиту сам** —
він лише запам'ятовує, _який аргумент звідки брати_.

Параметр-декоратор отримує `(target, propertyKey, parameterIndex)`. Саме
`parameterIndex` (позиція аргументу в сигнатурі методу) і є ключем. `@Body()`,
`@Param(name)`, `@Query(name)` складають у метадані методу мапу:

```
// src/decorators/params.ts
{ [parameterIndex]: { type: 'body' | 'param' | 'query', name } }
```

Під час запиту диспетчер (`src/dispatcher.ts`) читає цю мапу назад через
`Reflect.getMetadata` (у `router.ts`) і **будує масив аргументів за індексами**:
для `param` бере значення зі шляху, для `query` — з query-string, для `body` —
провалідоване тіло. Далі викликає метод контролера через контейнер:

```
handler.apply(controller, [ argForIndex0, argForIndex1, ... ])
```

Тобто контролер лишається чистою декларацією: він оголошує _що_ йому потрібно
(типами й декораторами параметрів), а диспетчер вирішує _звідки_ це взяти. Це
саме те, що робить NestJS у своєму HTTP-адаптері.

### Порядок декораторів (і чому це важливо)

Параметр-декоратори виконуються **до** декоратора методу, а той — **до**
декоратора класу. Тому на момент реєстрації маршруту (`@Get`/`@Post`) мапа
параметрів уже записана, і роутер бачить її. Це перевіряється тестом
`router.test.ts` → «param decorators run before the method decorator».

## Валідація (DTO + Pipe)

`ValidationPipe` для body-параметра дістає тип DTO з `design:paramtypes` методу
й робить **два кроки саме в цьому порядку**:

```ts
const instance = plainToInstance(Dto, body); // 1) plain → екземпляр класу
const errors = await validate(instance); // 2) валідація екземпляра
```

Без першого кроку `class-validator` нічого не перевірить (він працює з
екземплярами, не з plain-об'єктами). Наслідки:

| Тіло запиту | Результат                                                          |
| ----------- | ------------------------------------------------------------------ |
| невалідне   | `400` з тілом `{ message, errors: [{ field, constraints }] }`      |
| валідне     | у метод приходить **екземпляр `CreateUserDto`**, а не сирий об'єкт |

Помилка віддається **списком** усіх полів, а не першим — див.
`validation.test.ts`.

## Обмеження (за умовою)

- Використано: `reflect-metadata`, `class-validator`,
  `class-transformer`, вбудований `node:test` + `fetch` для HTTP-тестів.
- **відсутні**: `@nestjs/*`, `express`, `fastify` — маршрутизація
  повністю власна, поверх `node:http`.
- Ядро IoC не залежить від жодного контейнера сторонніх бібліотек.

## Acceptance criteria — де перевіряється

| Критерій                                      | Де                                        |
| --------------------------------------------- | ----------------------------------------- |
| Немає фреймворків (`grep`)                    | `package.json`, `src/` (лише `node:http`) |
| Маршрути з метаданих (`Reflect.getMetadata`)  | `src/router.ts`                           |
| Префікс склеюється (`/users` + `:id`)         | `router.test.ts`, `http.test.ts`          |
| `@Param` як аргумент                          | `http.test.ts`                            |
| `@Query` як окремий аргумент                  | `http.test.ts`                            |
| `@Body` — розпарсений об'єкт                  | `http.test.ts`                            |
| Валідація відхиляє (`400`, матч `/email/`)    | `validation.test.ts`                      |
| Валідація пропускає (`201`, `instanceof DTO`) | `validation.test.ts`                      |
| Контейнер ч.1 задіяно (той самий singleton)   | `container.test.ts`                       |
| Тести (≥6)                                    | **13 passed**                             |
| Працює в Docker                               | див. нижче                                |

## Docker

```bash
docker run --rm -it -v "$PWD":/app -w /app node:22-slim \
  sh -c "npm ci || npm install && npm test"
```

Використовує той самий образ `node:22-slim`, що й ДЗ #5.
