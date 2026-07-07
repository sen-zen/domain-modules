// import { prisma } from '@tastehub/prisma';
import { JWTConfig } from './config/JWTConfig';
import { JWTTokenService } from './services/JWTTokenService';

class Container {
    private static instance: Container;
    private dependencies: Map<string, any> = new Map();

    private constructor() {
        this.registerDependencies();
    }

    static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }

    private registerDependencies() {
        const jwtConfig = JWTConfig.fromEnv();

        this.dependencies.set('ITokenService', new JWTTokenService(jwtConfig));
    }

    get<T>(key: string): T {
        return this.dependencies.get(key);
    }
}

export const container = Container.getInstance();

