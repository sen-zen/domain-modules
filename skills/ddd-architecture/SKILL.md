---
name: "ddd-architecture"
description: "Архитектура на основе Domain-Driven Design (DDD) с чистыми слоями, Dependency Injection и модульной структурой. Реализует паттерн инверсии зависимостей через декораторы @Module и @Component."
---

# DDD Архитектура — Чистые слои и DI

> **📚 Связанные документы:**
> - [DDD Discovery](../ddd-discovery/SKILL.md) — подготовка к разработке
> - [DDD Module Template](../ddd-module-template/SKILL.md) — шаблон создания модулей
> - [DDD Code Review](../ddd-code-review/SKILL.md) — проверка архитектуры

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
│  - Оркестрация бизнес-процессов                             │
│  - Использует Domain интерфейсы и Entity                    │
│  - Возвращает Result<T> для управления ошибками            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN                                   │
│  - Сущности (Entities) с бизнес-логикой                     │
│  - Value Objects (неизменяемые, самовалидирующиеся)         │
│  - Repository Interfaces (без Prisma!)                      │
│  - Service Interfaces                                       │
│  ❌ НЕТ зависимостей от внешних фреймворков                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                INFRASTRUCTURE                                │
│  - Реализации Repository интерфейсов (через Prisma)          │
│  - Реализации Service интерфейсов                           │
│  - Mapper (Prisma ↔ Domain)                                 │
│  ✅ Только здесь используется @prisma/client                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта `packages/core/src/`

```
decorators/                        # Декораторы DI
├── Component.ts                  # @Component декоратор для компонентов
│   ├── name?: string             # Имя компонента
│   ├── scope?: Scope             # request, singleton, transient
│   ├── dependencies?: string[]   # Зависимости
│   └── module?: ModuleName       # Название модуля (AuthComponent, UserComponent)
│
└── Module.ts                     # @Module декоратор для модулей
    ├── description: string       # Описание модуля
    ├── version?: string          # Версия модуля
    ├── components: any[]         # UseCase'ы модуля
    ├── enabled?: boolean         # Включен ли модуль
    ├── repositories: any[]       # Репозитории
    ├── services: any[]           # Сервисы
    └── config?: Record<string, any>

di/                               # Dependency Injection
├── Container.ts                 # Базовый DI контейнер
│   ├── set(key, value, scope)   # Регистрация зависимости
│   ├── get(key, requestId?)      # Получение зависимости
│   ├── setFactory(key, factory) # Фабрика для lazy creation
│   └── createChild()            # Создание дочернего контейнера
│
└── types.ts                     # Типы Scope

errors/                          # Иерархия ошибок
├── ApplicationError.ts          # Базовый класс с кодом и мета-данными
├── DomainError.ts               # Доменная ошибка
├── NotFoundError.ts             # Ресурс не найден
├── UnauthorizedError.ts         # Неавторизован
└── ValidationError.ts           # Валидация данных

types/                           # Общие типы
├── index.ts                     # Экспорт типов
└── token.ts                     # JWT токены

utils/                           # Утилиты
└── result.ts                    # Result<T> pattern (Ok/Either)
    ├── ok(value: T)             # Успешный результат
    ├── fail(error: Error | string) # Ошибочный результат
    └── isFailure(value)         # Проверка на ошибку

modules/
├── auth/                       # Модуль авторизации
│   ├── application/
│   │   ├── index.ts            # Экспорт UseCases, Commands
│   │   ├── commands/           # Команды (LoginCommand)
│   │   └── use-cases/          # Use Cases
│   │       ├── LoginUseCase.ts    # Входящая аутентификация
│   │       ├── RefreshTokenUseCase.ts  # Обновление токенов
│   │       ├── LogoutUseCase.ts    # Исходящая аутентификация
│   │       └── ValidateSessionUseCase.ts # Проверка сессии
│   ├── domain/
│   │   ├── entities/
│   │   │   └── RefreshToken.ts  # Entity с токеном и userId
│   │   ├── repositories/
│   │   │   └── IRefreshTokenRepository.ts # Interface без Prisma
│   │   ├── services/
│   │   │   └── ITokenService.ts          # JWT генерация
│   │   └── types.ts                     # TokenPayload, AccessTokenPayload
│   ├── infrastructure/
│   │   ├── mappers/
│   │   │   └── RefreshTokenMapper.ts     # Prisma ↔ Domain маппинг
│   │   ├── repositories/
│   │   │   └── PrismaRefreshTokenRepository.ts
│   │   └── services/
│   │       └── JWTTokenService.ts        # Реализация ITokenService
│   ├── decorator.ts            # AuthComponent декоратор
│   ├── auth.module.ts          # Регистрация модуля через @Module
│   └── index.ts                   # Экспорт всего модуля

├── core/                       # Базовые компоненты
│   ├── application/
│   │   └── UseCase.ts             # Абстрактный базовый класс
│   │       ├── execute(input): Promise<Result<T>>
│   │       ├── protected ok<T>(value: T): Result<T>
│   │       ├── protected fail(error): Result<T>
│   │       └── protected tryCatch(fn): Result<T>
│   ├── domain/
│   │   ├── value-objects/         # Общие Value Objects
│   │   │   ├── Email.ts           # Самовалидирующийся email
│   │   │   └── Password.ts        # Хешированный пароль (bcrypt)
│   │   ├── entities/              # Общие сущности
│   │   └── index.ts               # Экспорт всех domain частей
│   ├── infrastructure/
│   │   └── repositories/
│   │       └── PrismaRepository.ts # Базовая репозиторий для Prisma
│   └── core.module.ts             # Регистрация CoreModule

├── user/                       # Модуль пользователей
│   ├── application/
│   │   ├── commands/
│   │   │   ├── ChangePasswordCommand.ts
│   │   │   ├── UpdateProfileCommand.ts
│   │   │   └── index.ts
│   │   └── use-cases/
│   │       └── GetCurrentUserUseCase.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── User.ts            # Сущность пользователя
│   │   │   └── index.ts
│   │   ├── value-objects/
│   │   │   ├── UserId.ts          # Value Object для UUID
│   │   │   └── Email.ts           # Value Object для email
│   │   ├── repositories/
│   │   │   └── IUserRepository.ts
│   │   └── index.ts               # Экспорт всех domain частей
│   ├── infrastructure/
│   │   ├── mappers/
│   │   │   └── UserMapper.ts      # PrismaUser ↔ Domain User
│   │   └── repositories/
│   │       └── PrismaUserRepository.ts
│   ├── decorator.ts            # UserComponent декоратор
│   └── user.module.ts          # Регистрация модуля через @Module

```

---

## 🏗️ Доменный слой (Domain)

### ✅ Правила для Domain:
1. **Нет зависимостей** от внешнего мира (`@prisma/client`, `@trpc/server`, `next`)
2. **Чистый TypeScript** без фреймворков
3. **Бизнес-логика** внутри сущностей
4. **Value Objects** — неизменяемые, самовалидирующиеся

### Value Objects

```typescript
// packages/core/src/modules/core/domain/value-objects/Email.ts
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

// packages/core/src/modules/core/domain/value-objects/Password.ts
import bcrypt from 'bcrypt';

export class Password {
    private static readonly SALT_ROUNDS = 10;
    
    private constructor(private readonly _value: string) {
        const hash = this._hash();
        if (!hash.compare(this._value)) {
            throw new ValidationError('Invalid password format');
        }
    }

    private _hash(): Promise<string> {
        return bcrypt.hash(this._value, Password.SALT_ROUNDS);
    }

    static async create(password: string): Promise<Password> {
        const hash = await this._hash();
        return new Password(hash);
    }

    verify(candidate: string): boolean {
        return bcrypt.compare(candidate, this._value);
    }
}
```

### Репозиторий (Интерфейс) — БЕЗ зависимостей от Prisma

```typescript
// packages/core/src/modules/auth/domain/repositories/IRefreshTokenRepository.ts
import type { RefreshToken } from '../entities/RefreshToken';

export interface IRefreshTokenRepository {
    save(token: RefreshToken): Promise<void>;
}

// packages/core/src/modules/user/domain/repositories/IUserRepository.ts
import { User } from '../entities/User';
import { UserId } from '../value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';

export interface IUserRepository {
    findById(id: UserId): Promise<User | null>;
    findByEmail(email: Email): Promise<User | null>;
}
```

### Сущность (Entity) с бизнес-логикой

```typescript
// packages/core/src/modules/user/domain/entities/User.ts
import { UserId } from '../value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';

export class User {
    private constructor(
        public readonly id: UserId,
        private _email: Email,
        private _username: string | null = null,
        private _passwordHash: Password | null = null,
        private _avatar: string | null = null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) { }

    static create(data: { email: string; username?: string }): User {
        const now = new Date();
        const email = Email.create(data.email);

        return new User(
            UserId.generate(),
            email,
            data.username,
            null,
            null,
            now,
            now,
        );
    }

    get email(): Email { return this._email; }
    
    changeEmail(newEmail: string): void {
        this._email = Email.create(newEmail);
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

### UserMapper — маппинг Prisma ↔ Domain

```typescript
// packages/core/src/modules/user/infrastructure/mappers/UserMapper.ts
import type { PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/User';
import { UserId } from '../../domain/value-objects/UserId';

export class UserMapper {
    static toDomain(prisma: PrismaUser): User {
        return User.create({
            email: prisma.email,
            username: prisma.username ?? undefined,
            password: undefined, // пароль хешируется при создании через UseCase
        });
    }

    static toPrimitives(user: User): Partial<PrismaUser> {
        return {
            email: user.email.value,
            username: user._username,
            updatedAt: user.updatedAt,
            avatar: user._avatar,
            createdAt: user.createdAt,
        };
    }
}

// packages/core/src/modules/auth/infrastructure/mappers/RefreshTokenMapper.ts
import type { PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/entities/RefreshToken';

export class RefreshTokenMapper {
    static toDomain(prisma: PrismaRefreshToken): RefreshToken {
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

    static toPrimitives(token: RefreshToken): Partial<PrismaRefreshToken> {
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
    
    protected ok<T>(value: T): Result<T> {
        return Result.ok(value);
    }
    
    protected fail<T>(error: Error | string): Result<T> {
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
import { AuthComponent } from '@auth/decorator';

import { Email } from '@core/domain/value-objects/Email';
import { Password } from '@core/domain/value-objects/Password';
import { RefreshToken } from '@auth/domain/entities/RefreshToken';
import { NotFoundError, UnauthorizedError } from '@/errors';

import type { Result } from '@/utils/result';
import type { ITokenService } from '@auth/domain/services/ITokenService';
import type { IUserRepository } from '@user/domain/repositories/IUserRepository';
import type { IRefreshTokenRepository } from '@auth/domain/repositories/IRefreshTokenRepository';

type UserLoginResponse = {
    id: string;
    email: string;
    name: string | null;
    isVerified: boolean;
    isBlocked: boolean;
}

export type LoginResponse = {
    user: UserLoginResponse,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
}

@AuthComponent({
    dependencies: [
        'TokenService',
        'UserRepository',
        'RefreshTokenRepository'
    ]
})
export class LoginUseCase extends UseCase<LoginCommand, LoginResponse> {
    constructor(
        private readonly tokenService: ITokenService,
        private readonly userRepository: IUserRepository,
        private readonly refreshTokenRepository: IRefreshTokenRepository
    ) { super() }

    async execute(command: LoginCommand): Promise<Result<LoginResponse>> {
        const emailResult = this.tryCatch(() => Email.create(command.email));
        if (emailResult.isFailure) {
            return this.fail(emailResult.error);
        }

        const passwordResult = this.tryCatch(() => Password.create(command.password));
        if (passwordResult.isFailure) {
            return this.fail(passwordResult.error);
        }

        const email = emailResult.value;
        const user = await this.userRepository.findAuthData(email.value);

        if (!user) {
            return this.fail(new NotFoundError('User', undefined, { email: command.email }));
        }

        if (!user.passwordHash.verify(command.password)) {
            return this.fail(new UnauthorizedError('Invalid credentials'));
        }

        const expires = this.tokenService.getExpiresIn();
        const tokens = await this.tokenService.generateTokens(user.id.value);

        const refreshToken = tokens.refreshToken;
        const familyId = tokens.familyId;
        const refreshExpires = expires.refreshTokenExpiresIn;

        await this.refreshTokenRepository.save(RefreshToken.create({
            token: refreshToken,
            familyId: familyId,
            userId: user.id,
            expiresIn: refreshExpires,
            userAgent: command.userAgent,
            ipAddress: command.ipAddress,
            deviceName: command.deviceName
        }));

        return this.ok({
            user: {
                id: user.id.value,
                email: user.email.value,
                name: user.name,
                isBlocked: false,
                isVerified: user.isVerified
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: refreshExpires.seconds,
        });
    }
}
```

---

## 🏗️ Модуль (Module) — через @Module декоратор

### auth.module.ts

```typescript
// packages/core/src/modules/auth/auth.module.ts
import { Module } from '../../../decorators/Module';
import { AUTH_MODULE_NAME } from './auth.module';
import { LoginUseCase, RefreshTokenUseCase, LogoutUseCase, ValidateSessionUseCase } from './application/use-cases';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/PrismaRefreshTokenRepository';
import { JWTTokenService } from './infrastructure/services/JWTTokenService';

export const AUTH_MODULE_NAME = 'AuthModule';

@Module({
    name: AUTH_MODULE_NAME,
    description: 'Authentication and authorization module',
    version: '1.0.0',

    dependencies: ["CoreModule"],

    components: [
        { 
            class: LoginUseCase,
            scope: Scope.Request
        },
        { 
            class: RefreshTokenUseCase,
            scope: Scope.Request
        },
        { 
            class: LogoutUseCase,
            scope: Scope.Request
        },
        { 
            class: ValidateSessionUseCase,
            scope: Scope.Request
        }
    ],

    repositories: [
        { 
            class: PrismaRefreshTokenRepository,
            scope: Scope.Singleton
        }
    ],

    services: [{ 
        class: JWTTokenService,
        scope: Scope.Singleton
    }]
})
export class AuthModule { }
```

### user.module.ts

```typescript
// packages/core/src/modules/user/user.module.ts
import { Module } from '../../../decorators/Module';
import { USER_MODULE_NAME } from './user.module';
import { PrismaUserRepository } from './infrastructure/repositories/PrismaUserRepository';

export const USER_MODULE_NAME = 'UserModule';

@Module({
    name: USER_MODULE_NAME,
    description: 'User management module',
    version: '1.0.0',

    dependencies: ["CoreModule"],

    components: []
})
export class UserModule { }
```

### Core module

```typescript
// packages/core/src/modules/core/core.module.ts
import { Module } from '../../decorators/Module';

@Module({
    name: 'CoreModule',
    description: '',
    version: '1.0.0',
    config: {}
})
export class CoreModule { }

// packages/core/src/index.ts
export * from './core.module';
export * from './di/Container';
export * from './decorators/Module';
export * from './decorators/Component';
```

---

## 🏷️ Декораторы

### AuthComponent — специфичный декоратор для auth модуля

```typescript
// packages/core/src/modules/auth/decorator.ts
import { Component, type ComponentConfig } from "@/decorators/Component";
import { AUTH_MODULE_NAME } from './auth.module';

export function AuthComponent(config: Omit<Partial<ComponentConfig>, 'module'>) {
    return Component({
        ...config,
        module: AUTH_MODULE_NAME
    })
}
```

### UserComponent — специфичный декоратор для user модуля

```typescript
// packages/core/src/modules/user/decorator.ts
import { Component, type ComponentConfig } from "@/decorators/Component";
import { USER_MODULE_NAME } from './user.module';

export function UserComponent(config: Omit<Partial<ComponentConfig>, 'module'>) {
    return Component({
        ...config,
        module: USER_MODULE_NAME
    })
}
```

---

## 📦 Экспорт типов и утилит

### types/index.ts — общие типы

```typescript
// packages/core/src/types/index.ts
export type { 
    TokenPayload, 
    AccessTokenPayload, 
    RefreshTokenPayload 
} from './token';
```

### utils/result.ts — Result pattern (Either pattern)

**Result<T> — это Either/Tuple pattern для обработки результатов выполнения.**

```typescript
// packages/core/src/utils/result.ts
export class Result<T> {
    private constructor(
        private readonly _isSuccess: boolean,
        private readonly _value?: T,
        private readonly _error?: Error | string
    ) { }

    get isSuccess(): boolean {
        return this._isSuccess;
    }

    get isFailure(): boolean {
        return !this._isSuccess;
    }

    get value(): T {
        if (this.isFailure) {
            throw new Error('Cannot get value from failed result');
        }
        return this._value as T;
    }

    get error(): Error | string {
        if (this.isSuccess) {
            throw new Error('Cannot get error from successful result');
        }
        return this._error as Error | string;
    }

    errorMessage: string = '';

    // Статический конструктор для успешного результата
    static ok<T>(value: T): Result<T> {
        return Result.ok(value);
    }

    // Статический конструктор для ошибки
    static fail<T>(error: Error | string): Result<T> {
        return Result.fail(error);
    }

    // Успешный — выполняем действие с value
    onSuccess(fn: (value: T) => void): Result<T> {
        if (this.isSuccess) {
            fn(this._value as T);
        }
        return this;
    }

    // Ошибочный — обрабатываем error
    onFailure(fn: (error: Error | string) => void): Result<T> {
        if (this.isFailure) {
            fn(this._error as Error | string);
        }
        return this;
    }
}
```

**Использование:**

```typescript
// Пример в UseCase
const emailResult = this.tryCatch(() => Email.create(command.email));
if (emailResult.isFailure) {
    return this.fail(emailResult.error);
}

const user = await this.userRepository.findAuthData(email.value);
if (!user) {
    return this.fail(new NotFoundError('User'));
}

return this.ok({
    accessToken: tokens.accessToken,
});
```
