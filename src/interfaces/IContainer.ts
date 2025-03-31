export interface IContainer {
    register<T>(key: string, factory: () => T): void;
    resolve<T>(key: string): T;
    createInstance<T>(key: string): T;
    clearInstances(): void;
}
