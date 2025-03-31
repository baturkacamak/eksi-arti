import { ContainerTheme, ContainerSize, ContainerShape, ContainerThemeConfig } from '../services/container-theme-service';

export interface IContainerThemeService {
    generateContainerClasses(config?: ContainerThemeConfig): string;
    applyCustomStyles(element: HTMLElement, config?: ContainerThemeConfig): void;
}
