import { ContainerShape, ContainerSize, ContainerTheme } from "../services/features/ui/container-theme-service";

/**
 * Component Container Configuration
 */
export interface IComponentContainerConfig {
    id?: string;
    className?: string;
    position?: 'inline' | 'floating' | 'fixed';
    direction?: 'horizontal' | 'vertical';
    gap?: number; // Gap between components in pixels
    padding?: number;
    width?: string;
    height?: string;
    visible?: boolean;
    customStyles?: Partial<CSSStyleDeclaration>;
    theme?: ContainerTheme;
    size?: ContainerSize;
    shape?: ContainerShape;
    isHoverable?: boolean;
    hasBorder?: boolean;
    hasShadow?: boolean;
}

export interface IContainer {
    register<T>(key: string, factory: () => T): void;
    resolve<T>(key: string): T;
    createInstance<T>(key: string): T;
    clearInstances(): void;
}
