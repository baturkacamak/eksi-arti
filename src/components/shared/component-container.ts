import { DOMService } from '../../services/dom-service';
import { CSSService } from '../../services/css-service';
import {LoggingService} from '../../services/logging-service';
import {
    ContainerShape,
    ContainerSize,
    ContainerTheme, ContainerThemeConfig,
    containerThemeService
} from "../../services/container-theme-service";
import {ICSSService} from "../../interfaces/services/ICSSService";
import {IDOMService} from "../../interfaces/services/IDOMService";
import {ILoggingService} from "../../interfaces/services/ILoggingService";
import {IComponentContainerConfig, IContainer} from "../../interfaces/IContainer";

/**
 * Component Container Class
 * A reusable container for organizing and managing UI components
 */
export class ComponentContainer {
    private domService: IDOMService;
    private cssService: ICSSService;
    private containerElement: HTMLElement | null = null;
    private components: HTMLElement[] = [];
    private config: IComponentContainerConfig;
    private static stylesApplied = false;
    private loggingService: ILoggingService;

    constructor(config: IComponentContainerConfig = {}) {
        this.domService = new DOMService();
        this.cssService = new CSSService(this.domService);
        this.loggingService = new LoggingService();

        // Default configuration
        this.config = {
            id: `eksi-component-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            className: '',
            position: 'inline',
            direction: 'horizontal',
            gap: 8,
            padding: 4,
            width: 'auto',
            height: 'auto',
            visible: true,
            ...config
        };

        this.applyContainerStyles();
        this.createContainer();
    }

    /**
     * Create the container element
     */
    private createContainer(): void {
        try {
            this.containerElement = this.domService.createElement('div');

            // Add base class
            this.domService.addClass(this.containerElement, 'eksi-component-container');

            // Set ID if provided
            if (this.config.id) {
                this.containerElement.id = this.config.id;
            }

            // Add position class
            this.domService.addClass(this.containerElement, `eksi-container-${this.config.position}`);

            // Add direction class
            this.domService.addClass(this.containerElement, `eksi-container-${this.config.direction}`);

            // Add custom class if provided
            if (this.config.className) {
                this.domService.addClass(this.containerElement, this.config.className);
            }

            // Apply theme
            if (this.config.theme) {
                this.applyTheme(this.config.theme);
            }

            // Apply configuration styles
            this.applyConfigStyles();

            // Hide if needed
            if (!this.config.visible) {
                this.containerElement.style.display = 'none';
            }

            this.loggingService.debug('Component container created', { id: this.config.id });
        } catch (error) {
            this.loggingService.error('Error creating component container:', error);
        }
    }

    /**
     * Apply configured styles to the container
     */
    private applyConfigStyles(): void {
        if (!this.containerElement) return;

        const containerStyle = this.containerElement.style;

        // Apply gap using CSS variables
        containerStyle.setProperty('--eksi-component-gap', `${this.config.gap}px`);

        // Apply padding
        containerStyle.padding = `${this.config.padding}px`;

        // Apply dimensions
        containerStyle.width = this.config.width || 'auto';
        containerStyle.height = this.config.height || 'auto';

        // Apply custom styles if provided
        if (this.config.customStyles) {
            Object.entries(this.config.customStyles).forEach(([property, value]) => {
                if (value !== undefined && value !== null) {
                    containerStyle[property as any] = value.toString();
                }
            });
        }
    }

    /**
     * Add a component to the container
     * @param component Component to add
     * @param position Optional position (start/end/index)
     * @returns The container instance for chaining
     */
    public add(component: HTMLElement, position?: 'start' | 'end' | number): ComponentContainer {
        if (!this.containerElement) return this;

        try {
            if (position === 'start') {
                // Add to the beginning
                this.domService.insertBefore(this.containerElement, component, this.containerElement.firstChild);
                this.components.unshift(component);
            } else if (typeof position === 'number' && position >= 0 && position < this.components.length) {
                // Add at specific position
                const referenceNode = this.components[position];
                this.domService.insertBefore(this.containerElement, component, referenceNode);
                this.components.splice(position, 0, component);
            } else {
                // Add to the end (default)
                this.containerElement.appendChild(component);
                this.components.push(component);
            }

           this.loggingService.debug('Component added to container', {
                containerId: this.config.id,
                componentCount: this.components.length
            });
        } catch (error) {
          this.loggingService.error('Error adding component to container:', error);
        }

        return this;
    }

    /**
     * Apply theme to the container
     */
    public applyTheme(theme: ContainerTheme = ContainerTheme.DEFAULT): void {
        if (!this.containerElement) return;

        const themeConfig: ContainerThemeConfig = {
            theme,
            isHoverable: true,
            hasBorder: true,
            size: this.config.size as ContainerSize || ContainerSize.MEDIUM,
            shape: this.config.shape as ContainerShape || ContainerShape.SLIGHTLY_ROUNDED,
            hasShadow: this.config.position === 'floating' || this.config.position === 'fixed'
        };

        containerThemeService.applyCustomStyles(this.containerElement, themeConfig);
    }

    /**
     * Remove a component by index or reference
     * @param component Component index or reference to remove
     * @returns The container instance for chaining
     */
    public remove(component: number | HTMLElement): ComponentContainer {
        if (!this.containerElement) return this;

        try {
            if (typeof component === 'number') {
                // Remove by index
                if (component >= 0 && component < this.components.length) {
                    const elementToRemove = this.components[component];
                    this.containerElement.removeChild(elementToRemove);
                    this.components.splice(component, 1);
                }
            } else {
                // Remove by reference
                const index = this.components.indexOf(component);
                if (index !== -1) {
                    this.containerElement.removeChild(component);
                    this.components.splice(index, 1);
                }
            }

           this.loggingService.debug('Component removed from container', {
                containerId: this.config.id,
                componentCount: this.components.length
            });
        } catch (error) {
          this.loggingService.error('Error removing component from container:', error);
        }

        return this;
    }

    /**
     * Clear all components from the container
     * @returns The container instance for chaining
     */
    public clear(): ComponentContainer {
        if (!this.containerElement) return this;

        try {
            // Remove all child elements
            while (this.containerElement.firstChild) {
                this.containerElement.removeChild(this.containerElement.firstChild);
            }

            // Clear components array
            this.components = [];

           this.loggingService.debug('Container cleared', { containerId: this.config.id });
        } catch (error) {
          this.loggingService.error('Error clearing container:', error);
        }

        return this;
    }

    /**
     * Show the container
     * @returns The container instance for chaining
     */
    public show(): ComponentContainer {
        if (this.containerElement) {
            this.containerElement.style.display = this.config.direction === 'horizontal' ? 'flex' : 'flex';
            this.config.visible = true;
        }
        return this;
    }

    /**
     * Hide the container
     * @returns The container instance for chaining
     */
    public hide(): ComponentContainer {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
            this.config.visible = false;
        }
        return this;
    }

    /**
     * Toggle container visibility
     * @returns The container instance for chaining
     */
    public toggle(): ComponentContainer {
        if (this.config.visible) {
            this.hide();
        } else {
            this.show();
        }
        return this;
    }

    /**
     * Update container configuration
     * @param config New configuration options
     * @returns The container instance for chaining
     */
    public updateConfig(config: Partial<IComponentContainerConfig>): ComponentContainer {
        this.config = { ...this.config, ...config };

        if (this.containerElement) {
            // Update classes if position or direction changed
            if (config.position) {
                this.domService.removeClass(this.containerElement, 'eksi-container-inline');
                this.domService.removeClass(this.containerElement, 'eksi-container-floating');
                this.domService.removeClass(this.containerElement, 'eksi-container-fixed');
                this.domService.addClass(this.containerElement, `eksi-container-${config.position}`);
            }

            if (config.direction) {
                this.domService.removeClass(this.containerElement, 'eksi-container-horizontal');
                this.domService.removeClass(this.containerElement, 'eksi-container-vertical');
                this.domService.addClass(this.containerElement, `eksi-container-${config.direction}`);
            }

            // Update other styles
            this.applyConfigStyles();

            // Update visibility if changed
            if (config.visible !== undefined) {
                if (config.visible) {
                    this.show();
                } else {
                    this.hide();
                }
            }
        }

        return this;
    }

    /**
     * Get the container element
     * @returns The container HTMLElement
     */
    public getElement(): HTMLElement | null {
        return this.containerElement;
    }

    /**
     * Append the container to a parent element
     * @param parent Parent element to append to
     * @returns The container instance for chaining
     */
    public appendTo(parent: HTMLElement): ComponentContainer {
        if (this.containerElement && parent) {
            try {
                parent.appendChild(this.containerElement);
               this.loggingService.debug('Container appended to parent', { containerId: this.config.id });
            } catch (error) {
              this.loggingService.error('Error appending container to parent:', error);
            }
        }
        return this;
    }

    /**
     * Insert the container before a reference element
     * @param referenceElement Element to insert before
     * @returns The container instance for chaining
     */
    public insertBefore(referenceElement: HTMLElement): ComponentContainer {
        if (this.containerElement && referenceElement && referenceElement.parentNode) {
            try {
                this.domService.insertBefore(referenceElement.parentNode, this.containerElement, referenceElement);
                this.loggingService.debug('Container inserted before reference element', { containerId: this.config.id });
            } catch (error) {
              this.loggingService.error('Error inserting container before reference element:', error);
            }
        }
        return this;
    }

    /**
     * Apply CSS styles for containers
     */
    private applyContainerStyles(): void {
        // Only apply styles once
        if (ComponentContainer.stylesApplied) return;

        const containerStyles = `
            /* Base container styles */
            .eksi-component-container {
                display: flex;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            /* Direction variants */
            .eksi-container-horizontal {
                flex-direction: row;
                align-items: center;
                gap: var(--eksi-component-gap, 8px);
            }
            
            .eksi-container-vertical {
                flex-direction: column;
                align-items: stretch;
                gap: var(--eksi-component-gap, 8px);
            }
            
            /* Position variants */
            .eksi-container-inline {
                position: relative;
            }
            
            .eksi-container-floating {
                position: absolute;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .eksi-container-fixed {
                position: fixed;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
                background-color: rgba(255, 255, 255, 0.98);
                border-radius: 6px;
                border: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-container-floating {
                    background-color: rgba(33, 33, 33, 0.95);
                    border-color: rgba(255, 255, 255, 0.1);
                }
                
                .eksi-container-fixed {
                    background-color: rgba(33, 33, 33, 0.98);
                    border-color: rgba(255, 255, 255, 0.1);
                }
            }
        `;

        this.cssService.addCSS(containerStyles);
        ComponentContainer.stylesApplied = true;
    }

    /**
     * Get current components
     * @returns Array of HTML elements
     */
    public getComponents(): HTMLElement[] {
        return [...this.components];
    }

    /**
     * Get component count
     * @returns Number of components
     */
    public getComponentCount(): number {
        return this.components.length;
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }

        this.containerElement = null;
        this.components = [];
    }
}