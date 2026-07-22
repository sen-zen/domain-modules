import { Component, type ComponentConfig } from "@/decorators/Component";
import { AUTH_MODULE_NAME } from './auth.module';

export function AuthComponent(config: Omit<Partial<ComponentConfig>, 'module'>) {
    return Component({
        ...config,
        module: AUTH_MODULE_NAME
    })
}
