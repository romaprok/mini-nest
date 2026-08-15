# mini-nest — part 1: IoC-контейнер

**частина 1 з 3**:

- **Частина 1 (тут):** `@Injectable`, резолв через `design:paramtypes`,
  `@Inject(token)`, скоупи `singleton`/`transient`, детекція циклів, тести.

## Структура

```
├─ src/
│  ├─ decorators/
│  │  ├─ injectable.ts   # @Injectable() + маркери scope/injectable
│  │  └─ inject.ts        # @Inject(token) — параметр-декоратор
│  ├─ container.ts        # сам IoC-контейнер (resolve, scopes, cycle detection)
│  ├─ tokens.ts           # типи Token/Constructor/Scope + createToken/tokenName
│  └─ index.ts            # публічний реекспорт
├─ test/                  # node:test (без зовнішнього фреймворку)
│  ├─ resolve.test.ts     # простий граф + рекурсивний A→B→C
│  ├─ scopes.test.ts      # singleton / shared / transient
│  ├─ inject.test.ts      # @Inject(token) з Symbol.for('CONFIG')
│  └─ cycle.test.ts       # цикл кидає осмислену помилку (не RangeError)
├─ tsconfig.json          # experimentalDecorators + emitDecoratorMetadata
├─ package.json           # reflect-metadata (prod), typescript + @types/node (dev)
├─ README.md              # цей файл
├─ theory.md              # теорія, необхідна для покриття лекції
└─ lecture.md             # конспект того, що згадується у самій Лекції 6
```

## Швидкий старт

```bash
npm install
npm test        # спершу компілює (tsc), потім ганяє node:test на dist/
```

Очікуваний результат — **9 пройдених тестів, 0 провалів** (мінімум за умовою — 5):

```
# tests 9
# pass 9
# fail 0
```

Мінімальний приклад використання:

```ts
import "reflect-metadata";
import { Container, Injectable, Inject } from "./src/index.js";

@Injectable()
class Logger {}

@Injectable()
class UserService {
  constructor(private readonly logger: Logger) {} // резолвиться за типом
}

const container = new Container();
const svc = container.resolve(UserService); // Logger створено й вкладено
```

## Docker

Для запуску в Docker без compose-файлу:

```bash
docker run --rm -it -v "$PWD":/app -w /app node:22-slim \
  sh -c "npm install && npm test"
```

## Як це працює

Коли клас позначено **хоч одним декоратором** і в `tsconfig.json` увімкнено
`emitDecoratorMetadata`, TypeScript при компіляції дописує поряд із класом
виклик `Reflect.metadata("design:paramtypes", [ ...типи конструктора ])`.
Тобто типи параметрів конструктора зберігаються як **рантайм-метадані** на
самому класі. Саме тому `@Injectable()` — не косметика: без будь-якого
декоратора TypeScript **не згенерує** `design:paramtypes` навіть при
увімкненому `emitDecoratorMetadata`, і контейнеру не буде звідки взяти список
залежностей.

Контейнер читає ці типи через
`Reflect.getOwnMetadata('design:paramtypes', Target)` і для кожного параметра
**рекурсивно** створює залежність, а потім викликає `new Target(...deps)`. Це
і є весь IoC: клас лише оголошує, _що_ йому потрібно (типами в конструкторі), а
контейнер вирішує, _звідки_ це взяти й у якому порядку зібрати граф.

Два нюанси, які й пояснюють решту API:

- **Інтерфейси стираються.** У рантаймі інтерфейсу не існує — у метаданих він
  перетворюється на `Object`. Тому для інтерфейсів (і примітивів) потрібен
  явний токен: `@Inject(SYMBOL)` записує в окремі метадані мапу
  `індекс_параметра → токен`, і вона має пріоритет над стертим типом.
- **`import 'reflect-metadata'` — найпершим рядком.** Поліфіл додає до `Reflect`
  методи `getMetadata`/`defineMetadata`; без нього емітовані компілятором
  виклики `Reflect.metadata(...)` просто впадуть.

### Скоупи

- `singleton` (за замовчуванням) — один екземпляр на контейнер, кешується й
  перевикористовується.
- `transient` — новий екземпляр на кожен `resolve`. Задається як
  `@Injectable({ scope: 'transient' })`.

### Детекція циклів

Резолв веде «шлях» (масив токенів). Якщо ми входимо в токен, який **вже є** у
поточному шляху, замість `RangeError: Maximum call stack size exceeded`
кидається `CircularDependencyError` із повним ланцюгом, напр. `A -> B -> A`.

## Обмеження

- **тест-раннер** — вбудований `node:test`, **без зовнішнього фреймворку**.
- **відсутні**: `@nestjs/*`, `inversify`, `tsyringe`, `typedi` —
  контейнер повністю власний.
- TypeScript — гілка **6.x** (`typescript@^6`).

```

```
# mini-nest
