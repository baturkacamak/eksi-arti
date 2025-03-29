// src/di/container.ts
export class Container {
    private static instance: Container;
    private services: Map<string, () => any> = new Map();
    private instances: Map<string, any> = new Map();

    private constructor() {}

    public static getInstance(): Container {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }

    // Register a service factory
    register<T>(key: string, factory: () => T): void {
        this.services.set(key, factory);
    }

    // Get or create a service instance (singleton by default)
    resolve<T>(key: string): T {
        // Return existing instance if available
        if (this.instances.has(key)) {
            return this.instances.get(key) as T;
        }

        // Create new instance
        if (!this.services.has(key)) {
            throw new Error(`Service ${key} not registered: ${key}`);
        }

        const instance = this.services.get(key)!() as T;
        this.instances.set(key, instance);
        return instance;
    }

    // Create a new instance without caching it (non-singleton)
    createInstance<T>(key: string): T {
        if (!this.services.has(key)) {
            throw new Error(`Service ${key} not registered: ${key}`);
        }

        return this.services.get(key)!() as T;
    }

    // Clear all instances but keep registrations
    clearInstances(): void {
        this.instances.clear();
    }
}