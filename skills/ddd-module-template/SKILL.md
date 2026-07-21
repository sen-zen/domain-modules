---
name: "ddd-module-template"
description: "Шаблон для создания нового модуля в DDD архитектуре с четким разделением на слои (Domain, Application, Infrastructure) и интеграцией с DI контейнером."
---
# Шаблон нового модуля DDD

## 📋 Быстрый старт

```bash
# Создание нового модуля
pnpm run create:module --name recipes

# Или вручную
mkdir -p packages/core/src/modules/recipes/{domain,application,infrastructure}
```

---

## 📁 Структура модуля

```
packages/core/src/modules/[module-name]/
├── [module-name].module.ts          # Регистрация модуля
├── index.ts                         # Экспорты
│
├── domain/                          # 🏛️ ДОМЕННЫЙ СЛОЙ
│   ├── entities/                    # Сущности
│   │   ├── [Entity].ts
│   │   └── index.ts
│   ├── value-objects/               # Value Objects
│   │   ├── [ValueObject].ts
│   │   └── index.ts
│   ├── repositories/                # Интерфейсы репозиториев
│   │   ├── I[Entity]Repository.ts
│   │   └── index.ts
│   ├── services/                    # Интерфейсы сервисов
│   │   ├── I[Domain]Service.ts
│   │   └── index.ts
│   └── events/                      # Доменные события
│       ├── [Event].ts
│       └── index.ts
│
├── application/                     # 📋 ПРИКЛАДНОЙ СЛОЙ
│   ├── commands/                    # Команды
│   │   ├── [Action][Entity]Command.ts
│   │   └── index.ts
│   ├── use-cases/                   # UseCases
│   │   ├── [Action][Entity]UseCase.ts
│   │   └── index.ts
│   ├── dto/                         # DTO
│   │   ├── [Entity]Dto.ts
│   │   └── index.ts
│   ├── mappers/                     # Мапперы
│   │   ├── [Entity]Mapper.ts
│   │   └── index.ts
│   └── __tests__/                   # Тесты
│       └── [UseCase].test.ts
│
└── infrastructure/                  # 🔧 ИНФРАСТРУКТУРНЫЙ СЛОЙ
    ├── repositories/                # Реализации репозиториев
    │   ├── Prisma[Entity]Repository.ts
    │   └── index.ts
    ├── services/                    # Реализации сервисов
    │   ├── [Domain]Service.ts
    │   └── index.ts
    ├── mappers/                     # Мапперы для инфраструктуры
    │   ├── [Entity]Mapper.ts
    │   └── index.ts
    └── config/                      # Конфигурация
        └── [Module]Config.ts
```

---

## 📝 Шаблоны файлов

### 1. **Модуль (module-name.module.ts)**

```typescript
// packages/core/src/modules/[module-name]/[module-name].module.ts
import { Module } from '../../decorators/Module';
import { Scope } from '../../di/Container';

// UseCases
import { Create[Entity]UseCase } from './application/use-cases/Create[Entity]UseCase';
import { Get[Entity]UseCase } from './application/use-cases/Get[Entity]UseCase';
import { Update[Entity]UseCase } from './application/use-cases/Update[Entity]UseCase';
import { Delete[Entity]UseCase } from './application/use-cases/Delete[Entity]UseCase';
import { List[Entity]UseCase } from './application/use-cases/List[Entity]UseCase';

// Repositories
import { Prisma[Entity]Repository } from './infrastructure/repositories/Prisma[Entity]Repository';

// Services
import { [Domain]Service } from './infrastructure/services/[Domain]Service';

@Module({
    name: '[ModuleName]Module',
    description: '[Module description]',
    version: '1.0.0',
    
    // ✅ Зависимости от других модулей
    dependencies: [
        'CoreModule',
        // 'AuthModule',
        // 'UserModule',
    ],
    
    // ✅ UseCases (Request Scope)
    useCases: [
        { class: Create[Entity]UseCase, scope: Scope.Request },
        { class: Get[Entity]UseCase, scope: Scope.Request },
        { class: Update[Entity]UseCase, scope: Scope.Request },
        { class: Delete[Entity]UseCase, scope: Scope.Request },
        { class: List[Entity]UseCase, scope: Scope.Request },
    ],
    
    // ✅ Repositories (Singleton Scope)
    repositories: [
        { class: Prisma[Entity]Repository, scope: Scope.Singleton },
    ],
    
    // ✅ Services (Singleton Scope)
    services: [
        { class: [Domain]Service, scope: Scope.Singleton },
    ],
    
    // ✅ Конфигурация модуля
    config: {
        // Конфигурационные параметры
        maxItems: 100,
        cacheTtl: 60000,
    },
    
    enabled: true,
})
export class [ModuleName]Module {}
```

### 2. **Domain Layer**

#### 2.1. **Entity**

```typescript
// packages/core/src/modules/[module-name]/domain/entities/[Entity].ts
import { [Entity]Id } from '../value-objects/[Entity]Id';
import type { I[Entity] } from './index';

export interface [Entity]Primitives {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class [Entity] {
    private constructor(
        public readonly id: [Entity]Id,
        private _name: string,
        private _description: string | null,
        private _isActive: boolean,
        public readonly createdAt: Date,
        private _updatedAt: Date,
    ) {}

    // ✅ Фабричный метод создания
    static create(data: {
        name: string;
        description?: string;
    }): [Entity] {
        const now = new Date();
        return new [Entity](
            [Entity]Id.generate(),
            data.name,
            data.description || null,
            true,
            now,
            now,
        );
    }

    // ✅ Восстановление из БД
    static reconstitute(primitives: [Entity]Primitives): [Entity] {
        return new [Entity](
            [Entity]Id.create(primitives.id),
            primitives.name,
            primitives.description,
            true,
            primitives.createdAt,
            primitives.updatedAt,
        );
    }

    // ✅ Бизнес-методы
    update(name: string, description?: string): void {
        this._name = name;
        this._description = description || null;
        this._updatedAt = new Date();
    }

    activate(): void {
        this._isActive = true;
        this._updatedAt = new Date();
    }

    deactivate(): void {
        this._isActive = false;
        this._updatedAt = new Date();
    }

    // ✅ Геттеры
    get name(): string {
        return this._name;
    }

    get description(): string | null {
        return this._description;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    // ✅ Сериализация
    toPrimitives(): [Entity]Primitives {
        return {
            id: this.id.value,
            name: this._name,
            description: this._description,
            createdAt: this.createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
```

#### 2.2. **Value Object**

```typescript
// packages/core/src/modules/[module-name]/domain/value-objects/[Entity]Id.ts
export class [Entity]Id {
    private constructor(private readonly _value: string) {
        if (!_value || _value.trim().length === 0) {
            throw new Error('[Entity]Id cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    static create(value: string): [Entity]Id {
        return new [Entity]Id(value);
    }

    static generate(): [Entity]Id {
        return new [Entity]Id(crypto.randomUUID());
    }

    equals(other: [Entity]Id): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}
```

#### 2.3. **Repository Interface**

```typescript
// packages/core/src/modules/[module-name]/domain/repositories/I[Entity]Repository.ts
import type { [Entity] } from '../entities/[Entity]';
import type { [Entity]Id } from '../value-objects/[Entity]Id';

export interface I[Entity]Repository {
    findById(id: [Entity]Id): Promise<[Entity] | null>;
    findByName(name: string): Promise<[Entity] | null>;
    findAll(limit?: number, offset?: number): Promise<[Entity][]>;
    save(entity: [Entity]): Promise<void>;
    update(entity: [Entity]): Promise<void>;
    delete(id: [Entity]Id): Promise<void>;
    existsByName(name: string): Promise<boolean>;
}
```

### 3. **Application Layer**

#### 3.1. **Command**

```typescript
// packages/core/src/modules/[module-name]/application/commands/Create[Entity]Command.ts
export interface Create[Entity]CommandData {
    name: string;
    description?: string;
}

export class Create[Entity]Command {
    constructor(
        public readonly name: string,
        public readonly description?: string,
    ) {}

    static create(data: Create[Entity]CommandData): Create[Entity]Command {
        return new Create[Entity]Command(data.name, data.description);
    }

    toObject(): Create[Entity]CommandData {
        return {
            name: this.name,
            description: this.description,
        };
    }

    validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.name || this.name.trim().length === 0) {
            errors.push('Name is required');
        }

        if (this.name && this.name.length < 3) {
            errors.push('Name must be at least 3 characters');
        }

        if (this.name && this.name.length > 100) {
            errors.push('Name must not exceed 100 characters');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}
```

#### 3.2. **UseCase**

```typescript
// packages/core/src/modules/[module-name]/application/use-cases/Create[Entity]UseCase.ts
import { UseCase } from '../../../../application/use-cases/UseCase';
import { Create[Entity]Command } from '../commands/Create[Entity]Command';
import { [Entity]Dto } from '../dto/[Entity]Dto';
import { [Entity] } from '../../domain/entities/[Entity]';
import { [Entity]Mapper } from '../mappers/[Entity]Mapper';
import {
    ValidationError,
    ConflictError,
} from '../../../../errors';
import type { I[Entity]Repository } from '../../domain/repositories/I[Entity]Repository';

export class Create[Entity]UseCase extends UseCase<Create[Entity]Command, [Entity]Dto> {
    constructor(
        private readonly [entity]Repository: I[Entity]Repository,
    ) {
        super();
    }

    async execute(command: Create[Entity]Command): Promise<Result<[Entity]Dto>> {
        // 1. Валидация команды
        const validation = command.validate();
        if (!validation.isValid) {
            return this.fail(
                new ValidationError(validation.errors.join(', '))
            );
        }

        // 2. Проверка существования
        const exists = await this.[entity]Repository.existsByName(command.name);
        if (exists) {
            return this.fail(
                new ConflictError(`[Entity] with name "${command.name}" already exists`)
            );
        }

        // 3. Создание сущности
        const entity = [Entity].create({
            name: command.name,
            description: command.description,
        });

        // 4. Сохранение
        await this.[entity]Repository.save(entity);

        // 5. Возврат DTO
        return this.ok([Entity]Mapper.toDto(entity));
    }
}
```

#### 3.3. **Mapper**

```typescript
// packages/core/src/modules/[module-name]/application/mappers/[Entity]Mapper.ts
import { [Entity] } from '../../domain/entities/[Entity]';
import { [Entity]Dto } from '../dto/[Entity]Dto';

export class [Entity]Mapper {
    static toDto(entity: [Entity]): [Entity]Dto {
        const primitives = entity.toPrimitives();
        return {
            id: primitives.id,
            name: primitives.name,
            description: primitives.description,
            createdAt: primitives.createdAt,
            updatedAt: primitives.updatedAt,
        };
    }

    static toDtoList(entities: [Entity][]): [Entity]Dto[] {
        return entities.map(entity => this.toDto(entity));
    }
}
```

#### 3.4. **DTO**

```typescript
// packages/core/src/modules/[module-name]/application/dto/[Entity]Dto.ts
export interface [Entity]Dto {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}
```

### 4. **Infrastructure Layer**

#### 4.1. **Repository Implementation**

```typescript
// packages/core/src/modules/[module-name]/infrastructure/repositories/Prisma[Entity]Repository.ts
import type { PrismaClient } from '@tastehub/prisma';
import { [Entity] } from '../../domain/entities/[Entity]';
import { [Entity]Id } from '../../domain/value-objects/[Entity]Id';
import type { I[Entity]Repository } from '../../domain/repositories/I[Entity]Repository';
import { [Entity]Mapper } from '../mappers/[Entity]Mapper';

export class Prisma[Entity]Repository implements I[Entity]Repository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: [Entity]Id): Promise<[Entity] | null> {
        const record = await this.prisma.[entity].findUnique({
            where: { id: id.value },
        });
        return record ? [Entity]Mapper.toDomain(record) : null;
    }

    async findByName(name: string): Promise<[Entity] | null> {
        const record = await this.prisma.[entity].findUnique({
            where: { name },
        });
        return record ? [Entity]Mapper.toDomain(record) : null;
    }

    async findAll(limit: number = 50, offset: number = 0): Promise<[Entity][]> {
        const records = await this.prisma.[entity].findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
        });
        return records.map([Entity]Mapper.toDomain);
    }

    async save(entity: [Entity]): Promise<void> {
        const data = [Entity]Mapper.toPrismaCreate(entity);
        await this.prisma.[entity].create({ data });
    }

    async update(entity: [Entity]): Promise<void> {
        const data = [Entity]Mapper.toPrismaUpdate(entity);
        await this.prisma.[entity].update({
            where: { id: entity.id.value },
            data,
        });
    }

    async delete(id: [Entity]Id): Promise<void> {
        await this.prisma.[entity].delete({
            where: { id: id.value },
        });
    }

    async existsByName(name: string): Promise<boolean> {
        const count = await this.prisma.[entity].count({
            where: { name },
        });
        return count > 0;
    }
}
```

#### 4.2. **Infrastructure Mapper**

```typescript
// packages/core/src/modules/[module-name]/infrastructure/mappers/[Entity]Mapper.ts
import type { [Entity] as Prisma[Entity] } from '@prisma/client';
import { [Entity] } from '../../domain/entities/[Entity]';
import { [Entity]Id } from '../../domain/value-objects/[Entity]Id';

export class [Entity]Mapper {
    static toDomain(prisma: Prisma[Entity]): [Entity] {
        return [Entity].reconstitute({
            id: prisma.id,
            name: prisma.name,
            description: prisma.description,
            createdAt: prisma.createdAt,
            updatedAt: prisma.updatedAt,
        });
    }

    static toPrismaCreate(entity: [Entity]): any {
        const data = entity.toPrimitives();
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    static toPrismaUpdate(entity: [Entity]): any {
        const data = entity.toPrimitives();
        return {
            name: data.name,
            description: data.description,
            updatedAt: new Date(),
        };
    }
}
```

---

## 🚀 Регистрация модуля

### 1. **В Core**

```typescript
// packages/core/src/index.ts
import 'reflect-metadata';

import { ModuleScanner } from './di/ModuleScanner';
import { moduleContainer, serviceContainer } from './di';

export async function initializeCore() {
    const scanner = new ModuleScanner();
    await scanner.scan('./modules');

    console.log('[Core] Initialized with', moduleContainer.getAllModules().size, 'modules');

    return {
        moduleContainer,
        serviceContainer
    };
}
```

### 2. **В tRPC**

```typescript
// packages/api/src/routers/[module].ts
import { moduleContainer } from '@domain/modules';
import { Create[Entity]UseCase, Get[Entity]UseCase } from '@domain/modules';

export const [module]Router = router({
    create: protectedProcedure
        .input(Create[Entity]Dto)
        .mutation(async ({ ctx, input }) => {
            const useCase = moduleContainer.getUseCase<Create[Entity]UseCase>('Create[Entity]UseCase');
            const result = await useCase.execute(input);
            return handleResult(result);
        }),

    get: publicProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ input }) => {
            const useCase = moduleContainer.getUseCase<Get[Entity]UseCase>('Get[Entity]UseCase');
            const result = await useCase.execute(input);
            return handleResult(result);
        }),
});
```

---

## ✅ Чеклист создания модуля

- [ ] Создана структура папок (`domain`, `application`, `infrastructure`)
- [ ] Создан файл модуля (`[module-name].module.ts`)
- [ ] Добавлены сущности в `domain/entities/`
- [ ] Добавлены Value Objects в `domain/value-objects/`
- [ ] Добавлены интерфейсы репозиториев в `domain/repositories/`
- [ ] Добавлены команды в `application/commands/`
- [ ] Добавлены UseCases в `application/use-cases/`
- [ ] Добавлены DTO в `application/dto/`
- [ ] Добавлены мапперы в `application/mappers/`
- [ ] Добавлены реализации репозиториев в `infrastructure/repositories/`
- [ ] Добавлены инфраструктурные мапперы в `infrastructure/mappers/`
- [ ] Модуль зарегистрирован в `core/index.ts`
- [ ] Добавлены тесты в `application/__tests__/`
- [ ] Обновлен `index.ts` модуля

---

## 🎯 Итог

Этот шаблон обеспечивает:

1. ✅ **Четкое разделение слоев** — Domain, Application, Infrastructure
2. ✅ **Модульность** — каждый модуль независим
3. ✅ **Интеграцию с DI** — автоматическая регистрация
4. ✅ **Типобезопасность** — полная типизация
5. ✅ **Расширяемость** — легко добавлять новые фичи
6. ✅ **Тестируемость** — каждый слой тестируется отдельно

**Готово!** 🚀
```

---

## 🔗 Связанные скиллы

| Скилл | Описание | Когда использовать |
|-------|----------|-------------------|
| [DDD Discovery](../ddd-discovery/SKILL.md) | Текущий скилл | Перед началом разработки |
| [DDD Архитектура](../ddd-architecture/SKILL.md) | Реализация архитектуры | После discovery, при разработке |
| [DDD Module Template](../ddd-module-template/SKILL.md) | Создание модуля | При создании нового модуля |
| [DDD Code Review](../ddd-code-review/SKILL.md) | Проверка кода | При Code Review |
