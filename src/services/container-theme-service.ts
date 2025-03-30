// src/services/container-theme-service.ts

import { CSSService } from './css-service';
import { LoggingService } from './logging-service';

/**
 * Container theme types
 */
export enum ContainerTheme {
    DEFAULT = 'default',
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    INFO = 'info',
    WARNING = 'warning',
    DANGER = 'danger',
    SUCCESS = 'success',
    NEUTRAL = 'neutral',
}

/**
 * Container size options
 */
export enum ContainerSize {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
}

/**
 * Container shape options
 */
export enum ContainerShape {
    SQUARE = 'square',          // 0px border radius
    SLIGHTLY_ROUNDED = 'slightly-rounded', // 4px border radius
    ROUNDED = 'rounded',        // 8px border radius
    PILL = 'pill',              // 16px border radius
}

/**
 * Configuration for a container theme
 */
export interface ContainerThemeConfig {
    theme?: ContainerTheme;
    size?: ContainerSize;
    shape?: ContainerShape;
    isHoverable?: boolean;
    hasShadow?: boolean;
    hasBorder?: boolean;
    customBackgroundColor?: string;
    customBorderColor?: string;
    customTextColor?: string;
}

/**
 * Service for applying themes to containers
 */
export class ContainerThemeService {
    private static instance: ContainerThemeService;
    private cssService: CSSService;
    private loggingService: LoggingService;
    private stylesApplied: boolean = false;

    private constructor() {
        this.cssService = new CSSService();
        this.loggingService = new LoggingService();
        this.applyBaseStyles();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): ContainerThemeService {
        if (!ContainerThemeService.instance) {
            ContainerThemeService.instance = new ContainerThemeService();
        }
        return ContainerThemeService.instance;
    }

    /**
     * Apply base styles for all container themes
     */
    private applyBaseStyles(): void {
        if (this.stylesApplied) return;

        const baseStyles = `
            /* Base Container Styles */
            .eksi-themed-container {
                display: flex;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            /* Direction variants */
            .eksi-container-horizontal {
                flex-direction: row;
                align-items: center;
            }
            
            .eksi-container-vertical {
                flex-direction: column;
                align-items: stretch;
            }
            
            /* Position variants */
            .eksi-container-inline {
                position: relative;
            }
            
            .eksi-container-floating {
                position: absolute;
                z-index: 1000;
                filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
            }
            
            .eksi-container-fixed {
                position: fixed;
                z-index: 10000;
                filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.2));
            }
            
            /* Theme variants */
            .eksi-theme-default {
                background-color: rgba(245, 245, 245, 0.8);
                border-color: rgba(0, 0, 0, 0.1);
                color: #333;
            }
            
            .eksi-theme-primary {
                background-color: rgba(129, 193, 75, 0.1);
                border-color: rgba(129, 193, 75, 0.3);
                color: #3c7113;
            }
            
            .eksi-theme-secondary {
                background-color: rgba(255, 112, 99, 0.1);
                border-color: rgba(255, 112, 99, 0.3);
                color: #d84232;
            }
            
            .eksi-theme-info {
                background-color: rgba(30, 136, 229, 0.1);
                border-color: rgba(30, 136, 229, 0.3);
                color: #1565c0;
            }
            
            .eksi-theme-warning {
                background-color: rgba(255, 160, 0, 0.1);
                border-color: rgba(255, 160, 0, 0.3);
                color: #e67700;
            }
            
            .eksi-theme-danger {
                background-color: rgba(229, 57, 53, 0.1);
                border-color: rgba(229, 57, 53, 0.3);
                color: #d32f2f;
            }
            
            .eksi-theme-success {
                background-color: rgba(67, 160, 71, 0.1);
                border-color: rgba(67, 160, 71, 0.3);
                color: #2e7d32;
            }
            
            .eksi-theme-neutral {
                background-color: rgba(224, 224, 224, 0.4);
                border-color: rgba(0, 0, 0, 0.05);
                color: #555;
            }
            
            /* Hover state */
            .eksi-container-hoverable.eksi-theme-default:hover {
                background-color: rgba(245, 245, 245, 0.95);
                border-color: rgba(0, 0, 0, 0.15);
            }
            
            .eksi-container-hoverable.eksi-theme-primary:hover {
                background-color: rgba(129, 193, 75, 0.15);
                border-color: rgba(129, 193, 75, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-secondary:hover {
                background-color: rgba(255, 112, 99, 0.15);
                border-color: rgba(255, 112, 99, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-info:hover {
                background-color: rgba(30, 136, 229, 0.15);
                border-color: rgba(30, 136, 229, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-warning:hover {
                background-color: rgba(255, 160, 0, 0.15);
                border-color: rgba(255, 160, 0, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-danger:hover {
                background-color: rgba(229, 57, 53, 0.15);
                border-color: rgba(229, 57, 53, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-success:hover {
                background-color: rgba(67, 160, 71, 0.15);
                border-color: rgba(67, 160, 71, 0.4);
            }
            
            .eksi-container-hoverable.eksi-theme-neutral:hover {
                background-color: rgba(224, 224, 224, 0.6);
                border-color: rgba(0, 0, 0, 0.08);
            }
            
            /* Size variants */
            .eksi-size-small {
                padding: 3px 6px;
                gap: 4px;
                font-size: 12px;
            }
            
            .eksi-size-medium {
                padding: 6px 10px;
                gap: 6px;
                font-size: 14px;
            }
            
            .eksi-size-large {
                padding: 8px 16px;
                gap: 8px;
                font-size: 16px;
            }
            
            /* Shape variants */
            .eksi-shape-square {
                border-radius: 0;
            }
            
            .eksi-shape-slightly-rounded {
                border-radius: 4px;
            }
            
            .eksi-shape-rounded {
                border-radius: 8px;
            }
            
            .eksi-shape-pill {
                border-radius: 16px;
            }
            
            /* Border styles */
            .eksi-container-with-border {
                border-width: 1px;
                border-style: solid;
            }
            
            /* Shadow styles */
            .eksi-container-with-shadow {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-theme-default {
                    background-color: rgba(45, 45, 45, 0.8);
                    border-color: rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                }
                
                .eksi-theme-primary {
                    background-color: rgba(129, 193, 75, 0.15);
                    border-color: rgba(129, 193, 75, 0.3);
                    color: #a0d468;
                }
                
                .eksi-theme-secondary {
                    background-color: rgba(255, 112, 99, 0.15);
                    border-color: rgba(255, 112, 99, 0.3);
                    color: #ff8a80;
                }
                
                .eksi-theme-info {
                    background-color: rgba(30, 136, 229, 0.15);
                    border-color: rgba(30, 136, 229, 0.3);
                    color: #64b5f6;
                }
                
                .eksi-theme-warning {
                    background-color: rgba(255, 160, 0, 0.15);
                    border-color: rgba(255, 160, 0, 0.3);
                    color: #ffd54f;
                }
                
                .eksi-theme-danger {
                    background-color: rgba(229, 57, 53, 0.15);
                    border-color: rgba(229, 57, 53, 0.3);
                    color: #ef9a9a;
                }
                
                .eksi-theme-success {
                    background-color: rgba(67, 160, 71, 0.15);
                    border-color: rgba(67, 160, 71, 0.3);
                    color: #81c784;
                }
                
                .eksi-theme-neutral {
                    background-color: rgba(70, 70, 70, 0.4);
                    border-color: rgba(255, 255, 255, 0.05);
                    color: #bdbdbd;
                }
                
                /* Hover in dark mode */
                .eksi-container-hoverable.eksi-theme-default:hover {
                    background-color: rgba(55, 55, 55, 0.95);
                    border-color: rgba(255, 255, 255, 0.15);
                }
                
                .eksi-container-hoverable.eksi-theme-primary:hover {
                    background-color: rgba(129, 193, 75, 0.25);
                    border-color: rgba(129, 193, 75, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-secondary:hover {
                    background-color: rgba(255, 112, 99, 0.25);
                    border-color: rgba(255, 112, 99, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-info:hover {
                    background-color: rgba(30, 136, 229, 0.25);
                    border-color: rgba(30, 136, 229, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-warning:hover {
                    background-color: rgba(255, 160, 0, 0.25);
                    border-color: rgba(255, 160, 0, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-danger:hover {
                    background-color: rgba(229, 57, 53, 0.25);
                    border-color: rgba(229, 57, 53, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-success:hover {
                    background-color: rgba(67, 160, 71, 0.25);
                    border-color: rgba(67, 160, 71, 0.4);
                }
                
                .eksi-container-hoverable.eksi-theme-neutral:hover {
                    background-color: rgba(80, 80, 80, 0.6);
                    border-color: rgba(255, 255, 255, 0.1);
                }
                
                /* Shadow in dark mode */
                .eksi-container-with-shadow {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
            }
            
            /* Specific container instances */
            /* Entry controls container */
            .eksi-entry-controls {
                padding: 4px !important;
                border-radius: 6px !important;
                margin-left: 8px !important;
                height: 32px !important;
            }
            
            /* Search controls container */
            .eksi-search-controls {
                padding: 5px 8px !important;
                border-radius: 8px !important;
            }
            
            /* Button styling inside containers */
            .eksi-themed-container .eksi-button {
                border: none !important;
                background: transparent !important;
                padding: 5px !important;
                border-radius: 4px !important;
                transition: background 0.2s ease, transform 0.2s ease !important;
            }
            
            .eksi-themed-container .eksi-button:hover {
                background: rgba(0, 0, 0, 0.08) !important;
                transform: translateY(-1px) !important;
            }
            
            /* Dark mode button hover */
            @media (prefers-color-scheme: dark) {
                .eksi-themed-container .eksi-button:hover {
                    background: rgba(255, 255, 255, 0.1) !important;
                }
            }
        `;

        this.cssService.addCSS(baseStyles);
        this.stylesApplied = true;
        this.loggingService.debug('Applied base container theme styles');
    }

    /**
     * Generate CSS classes for a themed container
     */
    public generateContainerClasses(config: ContainerThemeConfig = {}): string {
        const {
            theme = ContainerTheme.DEFAULT,
            size = ContainerSize.MEDIUM,
            shape = ContainerShape.SLIGHTLY_ROUNDED,
            isHoverable = true,
            hasBorder = true,
            hasShadow = false
        } = config;

        const classes = ['eksi-themed-container'];

        // Add theme class
        classes.push(`eksi-theme-${theme}`);

        // Add size class
        classes.push(`eksi-size-${size}`);

        // Add shape class
        classes.push(`eksi-shape-${shape}`);

        // Add conditional classes
        if (isHoverable) classes.push('eksi-container-hoverable');
        if (hasBorder) classes.push('eksi-container-with-border');
        if (hasShadow) classes.push('eksi-container-with-shadow');

        return classes.join(' ');
    }

    /**
     * Apply custom styles to a container element
     */
    public applyCustomStyles(element: HTMLElement, config: ContainerThemeConfig = {}): void {
        if (!element) return;

        // Apply theme classes
        const themeClasses = this.generateContainerClasses(config);
        element.className = element.className ? `${element.className} ${themeClasses}` : themeClasses;

        // Apply any custom colors if provided
        if (config.customBackgroundColor) {
            element.style.backgroundColor = config.customBackgroundColor;
        }

        if (config.customBorderColor && config.hasBorder !== false) {
            element.style.borderColor = config.customBorderColor;
        }

        if (config.customTextColor) {
            element.style.color = config.customTextColor;
        }
    }
}

// Export the singleton instance
export const containerThemeService = ContainerThemeService.getInstance();