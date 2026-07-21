---
name: "ddd-architecture"
description: "Архитектура на основе Domain-Driven Design (DDD) с чистыми слоями, Dependency Injection и модульной структурой. Реализует паттерн инверсии зависимостей через декораторы @Module и @Component."
---

# DDD Архитектура — Чистые слои и DI

> **📚 Связанные документы:**
> - [DDD Чеклист проверки кода](../ddd-code-review/SKILL.md) — полное описание архитектуры
> - [DDD Module Template](../ddd-module-template/SKILL.md) — шаблон создания модулей

---

## 🎯 Что делает этот скилл

Проектирует и реализует архитектуру на основе **Domain-Driven Design** (DDD) с разделением ответственности:
- **Чистый Domain слой** без внешних зависимостей
- **Application слой** для оркестрации бизнес-процессов (Use Cases)
- **Infrastructure слой** для реализации репозиториев и сервисов
- **Presentation слой** для взаимодействия с внешним миром

Добавляет **Dependency Injection** через декораторы `@Module` и `@Component`, обеспечивает тестируемость за счёт разделения интерфейсов от имплементаций.

---

## 🏗️ Архитектурные принципы

### ✅ Инверсия зависимостей (Dependency Inversion)

```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION (tRPC, Web)                    │
│  - Использует UseCases и Repositories из верхних слоёв      │
│  - Используе MobX для управления состоянием                 │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│               APPLICATION (Use Cases + Commands)             │
│  - Оркестирация бизнес-процессов                            │
│  - Использует Domain интерфейсы и Entity                   │
│  - Возвращает Result<T> для управления ошибками            │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN                                   │
│  - Сущности (Entities) с бизнес-логикой                    │
│  - Value Objects (неизменяемые, самовалидирующиеся)        │
│  - Repository Interfaces (без Prisma!)                     │
│  - Service Interfaces                                       │
│  ❌ НЕТ зависимостей от внешних фреймворков                 │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                INFRASTRUCTURE                                │
│  - Реализации Repository интерфейсов (через Prisma)         │
│  - Реализации Service интерфейсов                           │
│  - Mapper (Prisma ↔ Domain)                                 │
│  ✅ Только здесь используется @prisma/client               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта packages/core/src/

```
decorators/                        # Декораторы DI
├── Component.ts                   # @Component декоратор для компонентов
│   ├── name?: string              # Имя компонента
│   ├── scope?: Scope              # request, singleton, transient
│   └── dependencies?: string[]    # Зависимости
│
└── Module.ts                      # @Module декоратор для модулей
    ├── description: string        # Описание модуля
    ├── version?: string           # Версия модуля
    ├── components: any[]          # UseCase'ы модуля
    ├── enabled?: boolean          # Включен ли модуль
    └── config?: Record<string, any>

di/                                # Dependency Injection
├── Container.ts                   # Базовый DI контейнер
│   ├── set(key, value, scope)     # Регистрация зависимости
│   ├── get(key, requestId?)       # Получение зависимости
│   ├── setFactory(key, factory)   # Фабрика для lazy creation
│   └── createChild()              # Создание дочернего контейнера
│
├── ModuleContainer.ts             # Контейнер для модулей
├── ModuleScanner.ts               # Авто-сканер модулей через fs
│   ├── scan(directory)            # Сканирование .module.* файлов
│   ├── scanComponents(directory)  # Сканирование @Component
│   └── getResult()                # Результат сканирования
│
├── ServiceContainer.ts            # Контейнер для сервисов
└── UseCaseRegistry.ts             # Регистр UseCase'ов

errors/                            # Иерархия ошибок
├── ApplicationError.ts            # Базовый класс
├── DomainError.ts                 # Доменная ошибка
├── UnauthorizedError.ts           # Неавторизован
├── NotFoundError.ts               # Ресурс не найден
├── ConflictError.ts               # Конфликт ресурсов
└── ValidationError.ts             # Валидация данных

types/                             # Общие типы
├── device.ts                      # Типы устройств и sessions
├── index.ts                       # Экспорт типов
└── token.ts                       # JWT токены

utils/                             # Утилиты
└── result.ts                      # Result<T> pattern (Ok/Either)
    ├── ok(value: T)               # Успешный результат
    ├── fail(error: Error | string) # Ошибочный результат
    └── isFailure(value)           # Проверка на ошибку


modules/
├── auth/                         # Модуль авторизации
│   ├── application/
│   │   ├── index.ts              # Экспорт UseCases, Commands
│   │   ├── commands/             # Команды
│   │   │   ├── index.ts
│   │   │   ├── LoginCommand.ts   # { email, password, userAgent }
│   │   │   ├── RefreshTokenCommand.ts
│   │   └── use-cases/            # Use Cases
│   │       ├── index.ts
│   │       ├── LoginUseCase.ts
│   │       ├── LogoutUseCase.ts
│   │       └── RefreshTokenUseCase.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── RefreshToken.ts   # Entity с токеном и userId
│   │   │   ├── Session.ts        # Сессия пользователя
│   │   │   └── index.ts
│   │   ├── repositories/
│   │   │   ├── IUserRepository.ts         # Interface без Prisma
│   │   │   ├── IRefreshTokenRepository.ts # RefreshToken operations
│   │   │   ├── IUserRepository.types.ts   # DTO для findAuthData
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── ITokenService.ts          # JWT генерация
│   │   │   └── index.ts
│   │   └── index.ts                     # Экспорт всех domain частей
│   ├── infrastructure/
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   └── JWTConfig.ts             # Секреты и настройки JWT
│   │   ├── mappers/
│   │   │   ├── index.ts
│   │   │   └── RefreshTokenMapper.ts    # Prisma ↔ Domain маппинг
│   │   ├── repositories/
│   │   │   ├── index.ts
│   │   │   └── PrismaRefreshTokenRepository.ts
│   │   └── services/
│   │       ├── index.ts
│   │       └── JWTTokenService.ts       # Реализация ITokenService
│   ├── auth.module.ts             # Регистрация модуля через @Module
│   └── index.ts                   # Экспорт всего модуля
│
├── core/                         # Базовые компоненты
│   ├── application/
│   │   ├── index.ts
│   │   └── UseCase.ts             # Абстрактный базовый класс
│   │       ├── execute(input): Promise<Result<T>>
│   │       ├── protected ok<T>(value: T): Result<T>
│   │       ├── protected fail(error): Result<T>
│   │       └── protected tryCatch(fn): Result<T>
│   ├── domain/
│   │   ├── value-objects/         # Общие Value Objects
│   │   │   ├── Email.ts           # Самовалидирующийся email
│   │   │   ├── Password.ts        # Хешированный пароль (bcrypt)
│   │   │   ├── ExpiresAt.ts       # Дата истечения токена
│   │   │   └── index.ts
│   │   ├── entities/              # Общие сущности
│   │   └── index.ts               # Экспорт всех domain частей
│   ├── infrastructure/
│   │   └── repositories/
│   │       ├── PrismaRepository.ts # Базовая репозиторий для Prisma
│   │       └── index.ts
│   └── core.module.ts             # Регистрация CoreModule
│
└── user/                         # Модуль пользователей
    ├── application/
    │   ├── commands/
    │   │   ├── ChangePasswordCommand.ts
    │   │   ├── UpdateProfileCommand.ts
    │   │   └── index.ts
    │   └── use-cases/
    │       ├── GetCurrentUserUseCase.ts
    │       └── index.ts
    ├── domain/
    │   ├── entities/
    │   │   ├── User.ts            # Сущность пользователя
    │   │   │   ├── id: UserId     # Value Object для ID
    │   │   │   ├── email: Email   # Value Object для email
    │   │   │   ├── passwordHash?: Password
    │   │   │   └── refreshTokens: RefreshToken[]
    │   │   └── index.ts
    │   ├── value-objects/
    │   │   ├── UserId.ts          # Value Object для UUID
    │   │   └── index.ts
    │   ├── repositories/
    │   │   ├── IUserRepository.ts
    │   │   └── index.ts
    │   └── index.ts               # Экспорт всех domain частей
    ├── infrastructure/
    │   ├── mappers/
    │   │   └── UserMapper.ts      # PrismaUser ↔ Domain User
    │   └── repositories/
    │       └── PrismaUserRepository.ts
    └── user.module.ts             # Регистрация модуля через @Module

```

---

## 🏗️ Доменный слой (Domain)

### ✅ Правила для Domain:

1. **Нет зависимостей** от внешнего мира (`@prisma/client`, `@trpc/server`, `next`)
2. **Чистый TypeScript** без фреймворков
3. **Бизнес-логика** внутри сущностей
4. **Value Objects** — неизменяемые, самовалидирующиеся

---

### Value Objects

```typescript
// packages/core/src/domain/shared/value-objects/Email.ts
export class Email {
    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    private constructor(private readonly _value: string) {
        if (!Email.isValid(_value)) {
            throw new ValidationError('Invalid email format');
        }
        this._value = _value.toLowerCase().trim();
    }

    static create(email: string): Email {
        return new Email(email);
    }

    get value(): string {
        return this._value;
    }

    equals(other: Email): boolean {
        return this._value === other._value;
    }
}
```

### Репозиторий (Интерфейс) — БЕЗ зависимостей от Prisma

```typescript
// packages/core/src/modules/auth/domain/repositories/IUserRepository.ts
import { User } from '../entities/User';
import { UserId } from '../value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';
import type { UserAuthData} from './IUserRepository.types';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  delete(id: string): Promise<void>;
  findAuthData(email: string): Promise<UserAuthData | null>;
}
```

### Сущность (Entity) с бизнес-логикой

```typescript
// packages/core/src/modules/user/domain/entities/User.ts
import { UserId } from '../value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';
import { Password } from '../../../core/domain/value-objects/Password';

export class User {
    private constructor(
        public readonly id: UserId,
        private _email: Email,
        private _username: string | null = null,
        private _passwordHash: Password | null = null,
        private _avatar: string | null = null,
        private _languageCode: string = "ru",
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        private _refreshTokens: RefreshToken[] = []
    ) { }

    static create(data: { email: string; username?: string; password?: string }): User {
        const now = new Date();
        const email = Email.create(data.email);
        const password = data.password ? Password.create(data.password) : null;

        return new User(
            UserId.generate(),
            email,
            data.username,
            password,
            null,
            "ru",
            now,
            now,
            []
        );
    }

    get email(): Email { return this._email; }
    
    changeEmail(newEmail: string): void {
        this._email = Email.create(newEmail);
    }

    changePassword(newPassword: string): void {
        this._passwordHash = Password.create(newPassword);
    }
}
```

---

## 🏗️ Инфраструктурный слой (Infrastructure)

### ✅ Правила для Infrastructure:

1. **Реализует интерфейсы** из Domain
2. **Использует Prisma** для доступа к БД
3. **Маппит** Prisma → Domain и обратно через Mapper
4. **Нет бизнес-логики** — только маппинг и хранение данных

---

### PrismaRepository (базовый класс)

```typescript
// packages/core/src/modules/core/infrastructure/repositories/PrismaRepository.ts
import { PrismaClient } from '@prisma/client';

export abstract class PrismaRepository {
    protected constructor(private readonly prisma: PrismaClient) {}
}
```

### RefreshTokenMapper — маппинг Prisma ↔ Domain

```typescript
// packages/core/src/modules/auth/infrastructure/mappers/RefreshTokenMapper.ts
import type { PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/entities/RefreshToken';

export class RefreshTokenMapper {
    static toDomain(prisma: PrismaRefreshToken) {
        return RefreshToken.reconstitute({
            id: prisma.id,
            token: prisma.token,
            familyId: prisma.familyId,
            userId: prisma.userId,
            expiresAt: prisma.expiresAt,
            revokedAt: prisma.revokedAt,
            replacedBy: prisma.replacedBy,
            userAgent: prisma.userAgent,
            ipAddress: prisma.ipAddress,
            deviceName: prisma.deviceName,
            createdAt: prisma.createdAt,
        });
    }

    static toPrimitives(token: RefreshToken) {
        return token.toPrimitives();
    }
}
```

---

## 🏗️ Прикладной слой (Application)

### UseCase (Базовый класс)

```typescript
// packages/core/src/modules/core/application/UseCase.ts
import type { Result } from '@/utils/result';

export abstract class UseCase<TInput, TOutput> {
    abstract execute(input: TInput): Promise<Result<TOutput>>;
    
    protected ok<TOutput>(value: TOutput): Result<TOutput> {
        return Result.ok(value);
    }
    
    protected fail<TOutput>(error: Error | string): Result<TOutput> {
        return Result.fail(error);
    }
    
    protected tryCatch<T>(fn: () => T): Result<T> {
        try {
            return this.ok(fn());
        } catch (error) {
            return this.fail(error instanceof Error ? error : String(error));
        }
    }
}
```

### LoginUseCase — пример бизнес-процесса

```typescript
// packages/core/src/modules/auth/application/use-cases/LoginUseCase.ts
import { UseCase } from '@core/application/UseCase';
import { LoginCommand } from '@auth/application/commands/LoginCommand';
import { Email } from '@core/domain/value-objects/Email';
import { NotFoundError, UnauthorizedError } from '@/errors';
import type { Result } from '@/utils/result';

export class LoginUseCase extends UseCase<LoginCommand, LoginResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly userRepository: IUserRepository,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { super() }

    async execute(command: LoginCommand): Promise<Result<LoginResponse>> {
        // Валидация email и password через Value Objects
        const email = await this.tryCatch(() => Email.create(command.email));
        if (email.isFailure) return this.fail(email.error);

        // Проверка пользователя
        const user = await this.userRepository.findAuthData(email.value);
        if (!user) {
            return this.fail(new NotFoundError('User', undefined, { email: command.email }));
        }

        // Проверка пароля через Value Object Password
        if (!user.passwordHash.verify(command.password)) {
            return this.fail(new UnauthorizedError('Invalid credentials'));
        }

        // Генерация и сохранение токенa
        const tokens = await this.tokenService.generateTokens(user.id.value);
        await this.refreshTokenRepository.save(RefreshToken.create({ ... }));

        return this.ok({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    }
}
```

---

## 🏗️ Модуль (Module) — через @Module декоратор

### auth.module.ts

```typescript
import { Module } from "../../decorators/Module";

import { LoginUseCase, LogoutUseCase, RefreshTokenUseCase } from "./application/use-cases";

import { PrismaRefreshTokenRepository } from "./infrastructure/repositories";
import { JWTTokenService } from "./infrastructure/services";

@Module({
    name: 'AuthModule',
    description: 'Authentication and authorization module',
    version: '1.0.0',

    dependencies: ["CoreModule"],

    components: [
        { class: LoginUseCase },
        { class: LogoutUseCase },
        { class: RefreshTokenUseCase }
    ],

    repositories: [
        { class: PrismaRefreshTokenRepository }
    ],

    services: [{ class: JWTTokenService }]
})
export class AuthModule { }
```

---

## 📊 Диаграмма зависимостей

```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION (tRPC, Web)                    │
│  - Использует UseCases из Application                        │
│  - Использует Repositories из Infrastructure                 │
│  - MobX Store для клиентского состояния                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                APPLICATION (Use Cases)                       │
│  - Использует Domain Entities                                │
│  - Использует Repository Interfaces                          │
│  - Использует Service Interfaces                             │
│  - Возвращает Result<T> для управления ошибками             │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN                                   │
│  - Entities (бизнес-логика)                                 │
│  - Value Objects (неизменяемые, самовалидирующиеся)         │
│  - Repository Interfaces (без внешних зависимостей!)         │
│  - Service Interfaces                                        │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                INFRASTRUCTURE                                │
│  - PrismaUserRepository (реализация IUserRepository)         │
│  - JWTTokenService (реализация ITokenService)               │
│  - Mappers (Prisma ↔ Domain)                                │
│  ✅ Только здесь используется Prisma и JWT                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Правила для каждого слоя

### Domain:
- ❌ Нет `import` из `@prisma/client`
- ❌ Нет `import` из `@trpc/server`
- ❌ Нет `import` из `next`
- ✅ Только чистый TypeScript
- ✅ Бизнес-логика в сущностях
- ✅ Value Objects неизменяемые

### Application:
- ❌ Нет `import` из `@prisma/client`
- ❌ Нет `import` из `@trpc/server`
- ❌ Нет `import` из `next`
- ✅ Использует Domain интерфейсы
- ✅ Use Cases с бизнес-логикой
- ✅ Возвращает Result<T>

### Infrastructure:
- ✅ Использует Prisma (`@prisma/client`)
- ✅ Реализует Domain интерфейсы
- ✅ Маппит Prisma ↔ Domain через Mapper
- ❌ Нет бизнес-логики
- ✅ Использует DI контейнер

### Presentation (tRPC/Next.js):
- ✅ Использует tRPC (`@trpc/server`)
- ✅ Использует Next.js
- ✅ Использует MobX на клиенте
- ❌ Нет бизнес-логики

---

## 🎯 Итог

**Золотое правило:**
> **Domain не знает о внешнем мире. Все зависимости направлены ВНУТРЬ (к Domain).** 🚀

**Дополнительные возможности DI контейнера:**
- **request scope** — создаётся новый экземпляр на каждый запрос (для stateless сервисов)
- **singleton scope** — один экземпляр на всё приложение (для служебных сервисов)
- **transient scope** — новый экземпляр при каждом `get()`
- **setFactory()** — регистрация фабрик для lazy creation зависимостей
- **createChild()** — создание дочернего контейнера с наследованием зависимостей

---

## 🔗 Связанные скиллы

| Скилл | Описание | Когда использовать |
|-------|----------|-------------------|
| [DDD Discovery](../ddd-discovery/SKILL.md) | Текущий скилл | Перед началом разработки |
| [DDD Архитектура](../ddd-architecture/SKILL.md) | Реализация архитектуры | После discovery, при разработке |
| [DDD Module Template](../ddd-module-template/SKILL.md) | Создание модуля | При создании нового модуля |
| [DDD Code Review](../ddd-code-review/SKILL.md) | Проверка кода | При Code Review |
