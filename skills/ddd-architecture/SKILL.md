---
name: "ddd-architecture"
description: "Архитектура на основе Domain-Driven Design для AI. Реализует модульную архитектуру ограниченных контекстов с четким разделением ответственности и паттерном микроядра."
---

# DDD Архитектура

## Что делает этот скилл

Проектирует и реализует архитектуру на основе Domain-Driven Design (DDD) для AI, декомпозируя большие объекты в ограниченные контексты, реализуя паттерны чистой архитектуры и обеспечивая модульную, тестируемую структуру кода.

## Чистая архитектура
Архитектура Дяди Боба с явным правилом зависимостей.

```
┌─────────────────────────────────────────────────────────────┐
│                  Frameworks & Drivers                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Interface Adapters                    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │            Application Business Rules       │    │    │
│  │  │  ┌─────────────────────────────────────┐    │    │    │
│  │  │  │    Enterprise Business Rules        │    │    │    │
│  │  │  │         (Entities)                  │    │    │    │
│  │  │  └─────────────────────────────────────┘    │    │    │
│  │  │            (Use Cases)                      │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │      (Controllers, Gateways, Presenters)            │    │
│  └─────────────────────────────────────────────────────┘    │
│          (Web, DB, Devices, External Interfaces)            │
└─────────────────────────────────────────────────────────────┘
              Dependencies point INWARD only
```
### Слои

| Слой | Использует | Не использует |
|------|------------|---------------|
| **Domain** | Чистый TS | Prisma, tRPC, Next.js |
| **Application** | Domain | Prisma, tRPC, Next.js |
| **Infrastructure** | Domain, Prisma | tRPC, Next.js |
| **Presentation** | Application, Infrastructure | - |


### Структура проекта

```
src/
├── domain/                         # Core (no external dependencies)
│   ├── entities/                   # Бизнес-сущности с поведенческой логикой
│   │   ├── like/Like.ts            # Сущность лайка
│   │   ├── user/User.ts            # EVO: пользователь с поведением
│   │   └── ...
│   ├── repositories/               # Интерфейсы репозиториев (абстракции)
│   │   ├── IRecipeRepository.ts    # Интерфейс хранилища рецептов
│   │   ├── IRefreshTokenRepository.ts # Интерфейс хранилища refresh-токенов
│   │   └── ...
│   ├── value-objects/              # Value Objects (SVO/EVO)
│   │   ├── UserId.ts               # EVO: ID пользователя
│   │   ├── Email.ts                # Ссылка на email (валидация, equality)
│   │   ├── ExpiresAt/ExpiresIn.ts  # SVO: сроки действия токенов
│   │   └── ...
│   └── service/                    # Доменные сервисы
│       ├── ITokenService.ts        # Интерфейс работы с токенами (JWT)
│       └── ...
│
├── application/                    # Use case implementations
│   ├── index.ts                    # Экспорт use-case'ов
│   ├── commands/                   # Команды для event-driven архитектуры
│   │   ├── LoginCommand.ts         # Команда авторизации
│   │   └── ...
│   └── use-cases/                  # Use-case'ы (порты)
│       ├── LoginUseCase.ts         # Авторизация пользователя
│       ├── LogoutUseCase.ts        # Деавторизация
│       ├── RefreshTokenUseCase.ts  # Получение нового access-токена
│       ├── UseCase.ts              # Базовый интерфейс use-case'а
│       └── ...
│
└── infrastructure/                 # Инфраструктурный слой
│   ├── repositories/               # Конкретные реализации репозиториев
│   │   ├── PrismaUserRepository.ts # Реализация IUserRepository через Prisma
│   │   ├── PrismaRefreshTokenRepository.ts # Реализация IRefreshTokenRepository
│   │   └── ...
│   ├── services/                   # Доменные сервисы
│   │   ├── JWTTokenService.ts      # Имplementация ITokenService (JWT)
│   │   └── ...
│   ├── mappers/                    # Преобразователи доменных моделей в DTO'ы
│   │   ├── UserMapper.ts           # Превращение Prisma.User → domain.User
│   │   └── ...
├── config/                         # Преобразователи доменных моделей в DTO'ы
│   ├── JWTConfig.ts                # Настройки JWT (секрет, время)
│   └── ...
├── errors/                         # Ошибки
│   ├── DomainError.ts
│   └── ApplicationError.ts
│   └── ...
├── utils/                          # Утилиты
│   └── result.ts                   # Result тип
└── types/                          # Общие типы
    └── ...
```

## 🏗️ Доменный слой (Domain)
### ✅ Правила для Domain:

1. **Нет зависимостей** от внешнего мира
2. **Нет импортов** из `@prisma/client`
3. **Нет импортов** из `@trpc/server`
4. **Чистый TypeScript** без фреймворков
5. **Бизнес-логика** внутри сущностей

### Репозиторий (Интерфейс)

1. ❌ НЕТ зависимости от Prisma!

---

## 🏗️ Инфраструктурный слой (Infrastructure)

### ✅ Правила для Infrastructure:

1. **Реализует интерфейсы** из Domain
2. **Использует Prisma** для доступа к БД
3. **Маппит** Prisma → Domain и обратно
4. **Нет бизнес-логики**

### PrismaRefreshTokenRepository
```typescript
import type { PrismaClient } from '@tastehub/prisma';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../domain/value-objects';
import { RefreshToken } from '../../domain/entities/user/RefreshToken';
import { RefreshTokenMapper } from '../mappers/RefreshTokenMapper';

/**
 * Реализация репозитория через Prisma
 * ✅ Только здесь используется Prisma
 */
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(refreshToken: RefreshToken): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const data = RefreshTokenMapper.toPrismaCreate(refreshToken);
        const token = await this.prisma.refreshToken.create({ data });
        return token ? RefreshTokenMapper.toDomain(token) : null;
    }

    async revokeAllByUserId(userId: UserId): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId: userId.value, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
}
```
### Маппер
```typescript
import type { User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user/User';
/**
 * Маппер между Prisma и Domain
 * ✅ Единственное место, где Prisma связан с Domain
 */
export class UserMapper {
  static toDomain(prisma: PrismaUser): User {
    return User.reconstitute({
      id: prisma.id,
      email: prisma.email,
      username: prisma.username || '',
      passwordHash: prisma.passwordHash || '',
      isVerified: prisma.verificationToken === null,
      isBlocked: false, // Добавить поле в БД
      avatar: prisma.avatar,
      bio: prisma.bio,
      languageCode: prisma.languageCode,
      subscriptionStatus: prisma.subscriptionStatus,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  static toPrisma(user: User): any {
    const data = user.toPrimitives();
    return {
      id: data.id,
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      avatar: data.avatar,
      bio: data.bio,
      languageCode: data.languageCode,
      subscriptionStatus: data.subscriptionStatus,
      verificationToken: data.isVerified ? null : 'pending',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  static toPrismaUpdate(user: User): any {
    const data = user.toPrimitives();
    return {
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      avatar: data.avatar,
      bio: data.bio,
      languageCode: data.languageCode,
      subscriptionStatus: data.subscriptionStatus,
      verificationToken: data.isVerified ? null : 'pending',
      updatedAt: new Date(),
    };
  }
}
```

---

## 🏗️ Прикладной слой (Application)

### UseCase (Базовый класс)
```typescript
import { Result } from '../../utils/result';

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
    protected async tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
        try {
            const result = await fn();
            return this.ok(result);
        } catch (error) {
            return this.fail(error instanceof Error ? error : String(error));
        }
    }
}
```
### LoginUseCase

```typescript
import { UseCase } from './UseCase';
import { LoginCommand } from '../commands/LoginCommand';
import { AuthResponseDto } from '../dto/AuthResponseDto';
import { UserMapper } from '../mappers/UserMapper';

import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import { RefreshToken } from '../../domain/entities/user/RefreshToken';

import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors';

import type { ITokenService } from '../../domain/services/ITokenService';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';

export class LoginUseCase extends UseCase<LoginCommand, AuthResponseDto> {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository
  ) {
    super();
  }

  async execute(command: LoginCommand): Promise<Result<AuthResponseDto>> {
    // ✅ Валидация через Value Objects
    const emailResult = this.tryCatch(() => Email.create(command.email));
    if (emailResult.isFailure) {
      return this.fail(new ValidationError('Invalid email format'));
    }

    const passwordResult = this.tryCatch(() => Password.create(command.password));
    if (passwordResult.isFailure) {
      return this.fail(passwordResult.error);
    }

    const email = emailResult.value;
    const password = passwordResult.value;

    // ✅ Поиск пользователя (Domain)
    const userResult = await this.tryCatchAsync(async () => {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundError('User', undefined, { email: command.email });
      }
      return user;
    });

    if (userResult.isFailure) {
      return this.fail(userResult.error);
    }

    const user = userResult.value;

    // ✅ Бизнес-логика в сущности
    if (!user.verifyPassword(command.password)) {
      return this.fail(new UnauthorizedError('Invalid credentials'));
    }

    if (user.isBlocked) {
      return this.fail(new UnauthorizedError('User is blocked'));
    }

    if (!user.isVerified) {
      return this.fail(new UnauthorizedError('Email not verified'));
    }

    // ✅ Генерация токенов (Infrastructure)
    const tokensResult = await this.tryCatchAsync(async () => {
      const expires = this.tokenService.getExpiresIn();
      const tokens = await this.tokenService.generateTokens(
        user.id.value,
        command.deviceName,
        command.ipAddress,
        command.userAgent
      );
      return { tokens, expires };
    });

    if (tokensResult.isFailure) {
      return this.fail(tokensResult.error);
    }

    const { tokens, expires } = tokensResult.value;

    // ✅ Создание RefreshToken (Domain)
    const refreshToken = RefreshToken.create({
      token: tokens.refreshToken,
      familyId: tokens.familyId,
      userId: user.id,
      expiresIn: expires.refreshTokenExpiresIn,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      deviceName: command.deviceName,
    });

    // ✅ Сохранение (Infrastructure)
    const saveResult = await this.tryCatchAsync(async () => {
      await this.refreshTokenRepository.save(refreshToken);
    });

    if (saveResult.isFailure) {
      return this.fail(saveResult.error);
    }

    // ✅ Возврат DTO
    return this.ok({
      user: UserMapper.toDto(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: expires.accessTokenExpiresIn.seconds,
    });
  }
}
```

## 📊 Диаграмма зависимостей

```
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION (tRPC, Web)                  │
│  - Использует UseCases из Application                      │
│  - Использует Repositories из Infrastructure               │
│  - MobX Store для клиентского состояния                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                APPLICATION (Use Cases)                     │
│  - Использует Domain Entities                              │
│  - Использует Repository Interfaces                        │
│  - Использует Service Interfaces                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN                                 │
│  - Entities (бизнес-логика)                               │
│  - Value Objects (неизменяемые)                           │
│  - Repository Interfaces                                   │
│  - Service Interfaces                                      │
│  ❌ НЕТ зависимостей от внешнего мира!                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                INFRASTRUCTURE                              │
│  - PrismaUserRepository (реализация IUserRepository)       │
│  - JWTTokenService (реализация ITokenService)             │
│  - Mappers (Prisma ↔ Domain)                              │
│  ✅ Только здесь используется Prisma и JWT                │
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

### Application:
- ❌ Нет `import` из `@prisma/client`
- ❌ Нет `import` из `@trpc/server`
- ❌ Нет `import` из `next`
- ✅ Использует Domain интерфейсы
- ✅ Use Cases с бизнес-логикой

### Infrastructure:
- ✅ Использует Prisma (`@prisma/client`)
- ✅ Реализует Domain интерфейсы
- ✅ Маппит Prisma ↔ Domain
- ❌ Нет бизнес-логики

### Presentation:
- ✅ Использует tRPC (`@trpc/server`)
- ✅ Использует Next.js
- ✅ Использует MobX на клиенте
- ❌ Нет бизнес-логики

---

## 🎯 Итог

**Золотое правило:**
> **Domain не знает о внешнем мире. Все зависимости направлены внутрь (к Domain).** 🚀
