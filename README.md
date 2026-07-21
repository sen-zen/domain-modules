# @domain/modules

Центральный пакет DI (Dependency Injection) контейнер для архитектуры Clean Architecture / DDD.

## 🚀 Быстрый старт

```typescript
import { initializeCore } from '@domain/modules';

// Инициализация и возврат типизированного контейнера
const appContainer = await initializeCore();

// Использование chainable API
appContainer.set('TokenServer', new TokenServer());
appContainer.set('AuthService', new AuthService());

// Получение компонентов с автоматической типизацией
const tokenService = appContainer.get<TokenServer>('TokenServer');
```

## 📦 Основные типы

### Container
Базовый DI контейнер с поддержкой:
- **Scope**: singleton, request, transient
- **Autowiring**: автоматическое разрешение зависимостей
- **Factory injection**: регистрация фабрик для создания зависимостей

### ModuleContainer
Контейнер для управления модулями DDD:
- Регистрация @Module и @Component декораторов
- Управление зависимостями между модулями
- Lazy loading компонентов

### TypedContainer
Типизированный контейнер с generics от ComponentRegistry:
- Автоматическая типизация через имя ключа
- Поддержка всех scope из базового Container

## 🎯 Примеры использования

### База — Singleton (по умолчанию)
```typescript
const container = new Container();
container.set('UserService', new UserService());

// Получаем с singleton scope — кэшируется
const userService = container.get('UserService'); 
// Всегда возвращает один и тот же экземпляр
```

### Request Scope
```typescript
interface ICacheService {
    cache(data: string): Promise<string>;
}

class CacheService implements ICacheService {
    async cache(data: string): Promise<string> {
        // кеширование на запрос
        return data;
    }
}

const container = new Container();
container.set('CacheService', CacheService, 'request');

// Каждое get() создаёт новый экземпляр в рамках одного requestId
```

### Transient Scope
```typescript
class DatabaseConnection {
    connect() { /* ... */ }
    disconnect() { /* ... */ }
}

const container = new Container();
container.set('DatabaseConnection', DatabaseConnection, 'transient');

// Каждый вызов создаёт новый экземпляр
const conn1 = container.get('DatabaseConnection');
const conn2 = container.get('DatabaseConnection');
console.log(conn1 !== conn2); // true
```

### Factory Injection
```typescript
interface IPaymentService {
    processPayment(amount: number): Promise<void>;
}

class PaymentServiceFactory {
    constructor(private config: PaymentConfig) {}
    
    create(): IPaymentService {
        return new StripeService(this.config);
    }
}

const container = new Container();
container.setFactory('PaymentService', (mockInstance?: any) => {
    const factory = mockInstance || new PaymentServiceFactory(config);
    return factory.create();
});
```

## 📋 ComponentRegistry

Определение всех компонентов для автоматической типизации:

```typescript
export interface ComponentRegistry {
    // компоненты
    GetCurrentUserUseCase: GetCurrentUserUseCase;
    LoginUseCase: LoginUseCase;
    LogoutUseCase: LogoutUseCase;
    RefreshTokenUseCase: RefreshTokenUseCase;

    // Repositories
    UserRepository: IUserRepository;
    RefreshTokenRepository: IRefreshTokenRepository;

    // Services
    TokenService: ITokenService;
}
```

## 🔧 initializeCore

Асинхронная инициализация с авто-сканированием модулей:

```typescript
const { moduleContainer } = await initializeCore();
moduleContainer.registerModule(SomeModule);
moduleContainer.registerComponent(SomeComponent);
```

## 📝 Сценарии использования

### 1. Backend (Node.js)
```typescript
import { initializeCore } from '@domain/modules';
import TokenServer from '../TokenServer';
import AuthService from '../AuthService';

const appContainer = await initializeCore();
appContainer.set('TokenServer', new TokenServer());
appContainer.set('AuthService', new AuthService());
```

### 2. Web (Next.js, React)
```typescript
// apps/web/src/lib/di/index.ts
import { TypedContainer } from '@domain/modules/core';
import { AuthContext } from './context';

export function createContainer() {
    const container = new TypedContainer();
    
    container.set('AuthService', new AuthService());
    container.set('TokenService', new TokenService());
    
    return container;
}
```

### 3. Tests (Mocking)
```typescript
import { Container } from '@domain/modules/core';
import type { IUserRepository } from '@user/domain';

describe('UserService', () => {
    let container: Container<IUserRepository>;
    let mockRepo: IUserRepository;

    beforeEach(() => {
        mockRepo = new MockRepository();
        container = new Container<IUserRepository>();
        container.set('UserRepository', mockRepo);
    });

    it('should load user from repository', async () => {
        const service = container.get<LoginUseCase>('LoginUseCase');
        // тесты...
    });
});
```

## 🎓 Расширяемость

### Добавление новых компонентов
```typescript
interface ComponentRegistry {
    // ...existing components
    PaymentService: IPaymentService;
}

const container = new TypedContainer<ComponentRegistry>();
container.set('PaymentService', new PaymentService());
```

### Смена типа контейнера
```typescript
// Специфичный тип для репозиториев
interface MyRepositories {
    UserRepository: IUserRepository;
    OrderRepository: IOrderRepository;
}

const repoContainer = new TypedContainer<MyRepositories>();
repoContainer.set('UserRepository', newUserRepo());
repoContainer.set('OrderRepository', newOrderRepo());
```
