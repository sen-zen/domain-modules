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
| **Domain** | Чистый TS | Prisma, tRPC, Next.js, DI |
| **Application** | Domain | Prisma, tRPC, Next.js |
| **Infrastructure** | Domain, Prisma | tRPC, Next.js |
| **Presentation** | Application, Infrastructure | - |


## 📁 Структура проекта packages/core/src/

```
decorators/                         # Декораторы
└── Module.ts                       # @Module декоратор

di/                                 # Dependency Injection
├── Container.ts                    # Базовый DI контейнер
├── ModuleContainer.ts              # Контейнер модулей
├── ModuleScanner.ts                # Сканер модулей
├── ServiceContainer.ts             # Сервисный контейнер
└── index.ts

errors/                             # Ошибки
├── ApplicationError.ts
├── ConflictError.ts
├── DomainError.ts
├── NotFoundError.ts
├── UnauthorizedError.ts
├── UseCaseError.ts
└── ValidationError.ts

types/                              # Общие типы
├── device.ts
├── index.ts
└── token.ts

utils/                              # Утилиты
├── result.ts
└── types.ts

modules/
├── auth/                                                         # Модуль авторизации
│   ├── application/
│   │   ├── commands/ (LoginCommand, RefreshTokenCommand)
│   │   ├── use-cases/ (LoginUseCase, LogoutUseCase, RefreshTokenUseCase)
│   │   └── __tests__/
│   ├── domain/
│   │   ├── entities/ (RefreshToken, Session, User)
│   │   ├── repositories/ (IRefreshTokenRepository, IUserRepository)
│   │   └── services/ (ITokenService)
│   ├── infrastructure/
│   │   ├── config/ (JWTConfig)
│   │   ├── mappers/ (RefreshTokenMapper)
│   │   ├── repositories/ (PrismaRefreshTokenRepository, PrismaUserRepository via core)
│   │   └── services/ (JWTTokenService)
│   ├── auth.module.ts                                            # Регистрация модуля
│   └── index.ts (с экспортами)
├── core/                                                         # Базовый модуль
│   ├── application/                                              # Базовый Application слой
│   │   └── use-cases/
│   │       └── UseCase.ts                                        # Базовый класс UseCase
│   ├── domain/                                                   # Общий Domain слой
│   │   ├── value-objects/                                        # Общие VO (Email, ExpiresAt, etc.)
│   │   └── entities/
│   └── infrastructure/ (PrismaRepository, JWTTokenService)       # Infrastructure слой модуля
└── user/                                                         # Модуль пользователей
    ├── application/
    │   ├── commands/ (ChangePasswordCommand, UpdateProfileCommand)
    │   └── use-cases/ (GetCurrentUserUseCase)
    ├── domain/
    │   ├── entities/ (User)
    │   └── repositories/ (IUserRepository)
    ├── infrastructure/
    │   ├── mappers/ (UserMapper)
    │   └── repositories/ (PrismaUserRepository)
    └── user.module.ts
...N                                                              # Модули остальные

```

## 🏗️ Доменный слой (Domain)
### ✅ Правила для Domain:

1. **Нет зависимостей** от внешнего мира
2. **Нет импортов** из `@prisma/client`, `@trpc/server`, `next`
3. **Чистый TypeScript** без фреймворков
4. **Бизнес-логика** внутри сущностей
5. **Value Objects** — неизменяемые, самовалидирующиеся

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

### Репозиторий (Интерфейс)

1. ❌ НЕТ зависимости от Prisma!

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

### Сущность

```typescript
// packages/core/src/modules/auth/domain/entities/User.ts
import { RefreshToken } from '../../../auth/domain/entities/RefreshToken';
import { UserId } from '../value-objects/UserId';
import { Email } from '../../../core/domain/value-objects/Email';
import { Password } from '../../../core/domain/value-objects/Password';

export interface UserPrimitives {
    id: string;
    email: string;
    username: string | null;
    passwordHash: string | null;
    avatar: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
    languageCode: string;
    countryCode: string | null;
    subscriptionStatus: boolean;
    verificationToken: string | null;
    verificationTokenExpiresAt: Date | null;
    roleId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class User {
    private constructor(
        public readonly id: UserId,
        private _email: Email,
        private _username: string | null = null,
        private _passwordHash: Password | null = null,
        private _avatar: string | null = null,
        private _profilePictureUrl: string | null = null,
        private _bio: string | null = null,
        private _languageCode: string = "ru",
        private _countryCode: string | null = null,
        private _subscriptionStatus: boolean,
        private _verificationToken: string | null = null,
        private _verificationTokenExpiresAt: Date | null = null,
        private _roleId: string | null = null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        private _refreshTokens: RefreshToken[] = []
    ) { }

    static create(data: {
        email: string;
        username?: string;
        password?: string;
        languageCode?: string;
    }): User {
        const now = new Date();
        const email = Email.create(data.email);
        const password = data.password ? Password.create(data.password) : null;

        return new User(
            UserId.generate(),
            email,
            data.username,
            password,
            null,
            null,
            null,
            data.languageCode,
            null,
            false,
            null,
            null,
            null,
            now,
            now,
            []
        );
    }

    static reconstitute(primitives: UserPrimitives): User {
        return new User(
            UserId.create(primitives.id),
            Email.create(primitives.email),
            primitives.username,
            primitives.passwordHash ? Password.fromHash(primitives.passwordHash) : null,
            primitives.avatar,
            primitives.profilePictureUrl,
            primitives.bio,
            primitives.languageCode,
            primitives.countryCode,
            primitives.subscriptionStatus,
            primitives.verificationToken,
            primitives.verificationTokenExpiresAt,
            primitives.roleId,
            primitives.createdAt,
            primitives.updatedAt,
            []
        );
    }

    get passwordHash(): Password | null {
        return this._passwordHash;
    }

    get email(): Email {
        return this._email;
    }

    get username(): string | null {
        return this._username;
    }

    get avatar(): string | null {
        return this._avatar;
    }

    get profilePictureUrl(): string | null {
        return this._profilePictureUrl;
    }

    get bio(): string | null {
        return this._bio;
    }

    get languageCode(): string {
        return this._languageCode;
    }

    get countryCode(): string | null {
        return this._countryCode;
    }

    get subscriptionStatus(): boolean {
        return this._subscriptionStatus;
    }

    get verificationToken(): string | null {
        return this._verificationToken;
    }

    get roleId(): string | null {
        return this._roleId;
    }

    get isSubscribed(): boolean {
        return this._subscriptionStatus;
    }

    get isVerified(): boolean {
        return this._verificationToken === null;
    }

    changeEmail(newEmail: string): void {
        this._email = Email.create(newEmail);
    }

    changeUsername(newUsername: string): void {
        if (newUsername.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        this._username = newUsername;
    }

    changePassword(newPassword: string): void {
        this._passwordHash = Password.create(newPassword);
    }

    updateProfile(data: {
        avatar?: string;
        profilePictureUrl?: string;
        bio?: string;
        languageCode?: string;
        countryCode?: string;
    }): void {
        if (data.avatar !== undefined) this._avatar = data.avatar;
        if (data.profilePictureUrl !== undefined) this._profilePictureUrl = data.profilePictureUrl;
        if (data.bio !== undefined) this._bio = data.bio;
        if (data.languageCode !== undefined) this._languageCode = data.languageCode;
        if (data.countryCode !== undefined) this._countryCode = data.countryCode;
    }

    isVerifiedWithEmail(email: string): boolean {
        return this._email.equals(Email.create(email)) && this.isVerified;
    }

    /**
     * Устанавливает verificationToken для email верификации
     */
    setVerificationToken(token: string, expiresAt: Date): void {
        this._verificationToken = token;
        this._verificationTokenExpiresAt = expiresAt;
    }

    verifyEmail(): void {
        if (this.isVerified) return;
        this._verificationToken = null;
        this._verificationTokenExpiresAt = null;
    }

    activateSubscription(): void {
        this._subscriptionStatus = true;
    }

    deactivateSubscription(): void {
        this._subscriptionStatus = false;
    }

    assignRole(roleId: string): void {
        this._roleId = roleId;
    }

    addRefreshToken(token: RefreshToken): void {
        this._refreshTokens.push(token);
    }

    canLogin(): boolean {
        return this.isVerified && this._passwordHash !== null;
    }

    private domainEvents: any[] = [];

    addDomainEvent(event: any): void {
        this.domainEvents.push(event);
    }

    clearEvents(): void {
        this.domainEvents = [];
    }

    getEvents(): any[] {
        return [...this.domainEvents];
    }

    toPrimitives(): UserPrimitives {
        return {
            id: this.id.value,
            email: this._email.value,
            username: this._username,
            passwordHash: this._passwordHash ? this._passwordHash.value : null,
            avatar: this._avatar,
            profilePictureUrl: this._profilePictureUrl,
            bio: this._bio,
            languageCode: this._languageCode,
            countryCode: this._countryCode,
            subscriptionStatus: this._subscriptionStatus,
            verificationToken: this._verificationToken,
            verificationTokenExpiresAt: this._verificationTokenExpiresAt,
            roleId: this._roleId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
```

---

## 🏗️ Инфраструктурный слой (Infrastructure)

### ✅ Правила для Infrastructure:

1. **Реализует интерфейсы** из Domain
2. **Использует Prisma** для доступа к БД
3. **Маппит** Prisma → Domain и обратно
4. **Нет бизнес-логики**

### PrismaRefreshTokenRepository
```typescript
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { UserId } from '../../../user/domain/value-objects/UserId';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { RefreshTokenMapper } from '../mappers/RefreshTokenMapper';
import { PrismaRepository } from '../../../core/infrastructure/repositories/PrismaRepository';

export class PrismaRefreshTokenRepository extends PrismaRepository implements IRefreshTokenRepository {

    async findById(id: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { id }
        });
        return refreshToken ? RefreshTokenMapper.toDomain(refreshToken) : null;
    }

    async findByToken(token: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain> | null> {
        const refreshToken = await this.prisma.refreshToken.findFirst({
            where: { token }
        });
        return refreshToken ? RefreshTokenMapper.toDomain(refreshToken) : null;
    }

    async findByUserId(userId: UserId): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>[]> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: { userId: userId.value },
            orderBy: { createdAt: 'desc' }
        });
        return tokens.map(RefreshTokenMapper.toDomain);
    }

    async findByFamilyId(familyId: string): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>[]> {
        const tokens = await this.prisma.refreshToken.findMany({
            where: { familyId },
            orderBy: { createdAt: 'desc' }
        });
        return tokens.map(RefreshTokenMapper.toDomain);
    }

    async save(refreshToken: RefreshToken): Promise<ReturnType<typeof RefreshTokenMapper.toDomain>> {
        const data = RefreshTokenMapper.toPrismaCreate(refreshToken);
        const token = await this.prisma.refreshToken.create({ data });
        return RefreshTokenMapper.toDomain(token);
    }

    async update(refreshToken: RefreshToken): Promise<void> {
        const data = RefreshTokenMapper.toPrismaUpdate(refreshToken);
        await this.prisma.refreshToken.update({
            where: { id: refreshToken.id },
            data
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.refreshToken.delete({
            where: { id }
        });
    }

    async revoke(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: { revokedAt: new Date() }
        });
    }

    async revokeAllByUserId(userId: UserId): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId: userId.value, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }

    async revokeAllByFamilyId(familyId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { familyId, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }

    async rotateAndRevoke(oldTokenId: string, newToken: RefreshToken): Promise<void> {
        const now = new Date();
        await this.prisma.$transaction(async (prisma) => {
            await prisma.refreshToken.update({
                where: { id: oldTokenId },
                data: {
                    revokedAt: now,
                    replacedBy: newToken.id
                }
            });

            const data = RefreshTokenMapper.toPrismaCreate(newToken);
            await prisma.refreshToken.create({ data });
        });
    }

    async revokeAllExcept(userId: UserId, tokenId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId: userId.value,
                id: { not: tokenId },
                revokedAt: null
            },
            data: { revokedAt: new Date() }
        });
    }


    async updateLastUsed(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: { lastUsedAt: new Date() }
        });
    }
}

```
### Маппер

```typescript
// packages/core/src/modules/auth/infrastructure/mappers/RefreshTokenMapper.ts
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { RefreshToken as PrismaRefreshToken } from '@tastehub/prisma'

export class RefreshTokenMapper {
    static toDomain(prisma: PrismaRefreshToken) {
        if (!prisma.token) {
            throw new Error('Refresh token value is required');
        }
        if (!prisma.userId) {
            throw new Error('User ID is required');
        }
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
            lastUsedAt: prisma.lastUsedAt,
        });
    }

    static toPrisma(token: RefreshToken) {
        const data = token.toPrimitives();
        if (!data.token) {
            throw new Error('Refresh token value is required');
        }
        if (!data.userId) {
            throw new Error('User ID is required');
        }
        return {
            id: data.id,
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
            createdAt: data.createdAt,
            lastUsedAt: data.lastUsedAt,
        } as PrismaRefreshToken;
    }

    static toDto(prisma: PrismaRefreshToken): {
        id: string;
        familyId: string;
        userId: string;
        expiresAt: Date;
        isRevoked: boolean;
        isExpired: boolean;
        deviceName: string | null;
        lastUsedAt: Date;
        createdAt: Date;
    } {
        const now = new Date();
        return {
            id: prisma.id,
            familyId: prisma.familyId,
            userId: prisma.userId,
            expiresAt: prisma.expiresAt,
            isRevoked: prisma.revokedAt !== null,
            isExpired: prisma.expiresAt < now,
            deviceName: prisma.deviceName,
            lastUsedAt: prisma.lastUsedAt,
            createdAt: prisma.createdAt,
        };
    }

    static toPublicDto(prisma: PrismaRefreshToken): {
        id: string;
        deviceName: string | null;
        lastUsedAt: Date;
        isActive: boolean;
    } {
        const now = new Date();
        const isActive = prisma.revokedAt === null && prisma.expiresAt > now;
        return {
            id: prisma.id,
            deviceName: prisma.deviceName,
            lastUsedAt: prisma.lastUsedAt,
            isActive,
        };
    }

    static toDomainList(prismaTokens: PrismaRefreshToken[]): RefreshToken[] {
        return prismaTokens.map(token => this.toDomain(token));
    }

    static toDtoList(prismaTokens: PrismaRefreshToken[]): ReturnType<typeof this.toDto>[] {
        return prismaTokens.map(token => this.toDto(token));
    }

    static toPublicDtoList(prismaTokens: PrismaRefreshToken[]): ReturnType<typeof this.toPublicDto>[] {
        return prismaTokens.map(token => this.toPublicDto(token));
    }

    static toPrismaUpdate(token: RefreshToken): Partial<PrismaRefreshToken> {
        const data = token.toPrimitives();
        return {
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
            lastUsedAt: data.lastUsedAt,
        };
    }

    static toPrismaCreate(token: RefreshToken): Omit<PrismaRefreshToken, 'id' | 'createdAt' | 'lastUsedAt'> {
        const data = token.toPrimitives();
        if (!data.token) {
            throw new Error('Refresh token value is required');
        }
        if (!data.userId) {
            throw new Error('User ID is required');
        }
        return {
            token: data.token,
            familyId: data.familyId,
            userId: data.userId,
            expiresAt: data.expiresAt,
            revokedAt: data.revokedAt,
            replacedBy: data.replacedBy,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            deviceName: data.deviceName,
        }
    }

    static toPrismaLastUsed(id: string, lastUsedAt: Date): Partial<PrismaRefreshToken> {
        return {
            id,
            lastUsedAt,
        };
    }

    static toPrismaRevoke(id: string, revokedAt: Date): Partial<PrismaRefreshToken> {
        return {
            id,
            revokedAt,
        };
    }

    static toPrismaRotate(
        oldTokenId: string,
        newTokenId: string,
        revokedAt: Date
    ): Partial<PrismaRefreshToken> {
        return {
            id: oldTokenId,
            revokedAt,
            replacedBy: newTokenId,
        };
    }

    static toStats(data: {
        total: number;
        active: number;
        revoked: number;
        expired: number;
    }): {
        total: number;
        active: number;
        revoked: number;
        expired: number;
    } {
        return {
            total: data.total,
            active: data.active,
            revoked: data.revoked,
            expired: data.expired,
        };
    }
}
```

---

## 🏗️ Прикладной слой (Application)

### UseCase (Базовый класс)
```typescript
// packages/core/src/application/use-cases/UseCase.ts
import { Result } from '../../../utils/result';

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
// packages/core/src/modules/auth/application/use-cases/LoginUseCase.ts
import { UseCase } from '../../../core/application/UseCase';
import { LoginCommand } from '../commands/LoginCommand';

import { Email } from '../../../core/domain/value-objects/Email';
import { Password } from '../../../core/domain/value-objects/Password';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { NotFoundError, UnauthorizedError } from '../../../../errors';

import type { Result } from '../../../../utils/result';
import type { ITokenService } from '../../domain/services/ITokenService';
import type { IUserRepository } from '../../domain/repositories/IUserRepository';
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';

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

## 🏗️ Модуль (Module)

### auth.module.ts


```typescript
import { Module } from "../../decorators/Module";

import {
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase
} from "./application/use-cases";

import { PrismaRefreshTokenRepository } from "./infrastructure/repositories";
import { JWTTokenService } from "./infrastructure/services";

@Module({
    name: 'AuthModule',
    description: 'Authentication and authorization module',
    version: '1.0.0',

    dependencies: ["CoreModule"],
    useCases: [
        { class: LoginUseCase },
        { class: LogoutUseCase },
        { class: RefreshTokenUseCase }
    ],
    repositories: [
        { class: PrismaRefreshTokenRepository }
    ],
    services: [{ class: JWTTokenService }],
    config: {}
})
export class AuthModule { }
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
- ✅ Маппит Prisma ↔ Domain
- ❌ Нет бизнес-логики
- ✅ Использует DI контейнер

### Presentation:
- ✅ Использует tRPC (`@trpc/server`)
- ✅ Использует Next.js
- ✅ Использует MobX на клиенте
- ❌ Нет бизнес-логики

---

## 🎯 Итог

**Золотое правило:**
> **Domain не знает о внешнем мире. Все зависимости направлены внутрь (к Domain).** 🚀
