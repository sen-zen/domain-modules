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

export * from './modules/core';
export * from './modules/auth';
export * from './modules/user';
export * from './di';

