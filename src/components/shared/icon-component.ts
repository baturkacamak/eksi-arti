
import {ICSSService} from '../../interfaces/services/shared/ICSSService';
import {ILoggingService} from '../../interfaces/services/shared/ILoggingService';
import {IDOMService} from '../../interfaces/services/shared/IDOMService';
import {IconProps, IconTransitionOptions, IIconComponent} from "../../interfaces/components/IIconComponent";
import { MATERIAL_ICONS } from '../../constants/fonts';
import { IFontLoaderService } from '../../interfaces/services/shared/IFontLoaderService';

export class IconComponent implements IIconComponent {
    private static stylesApplied = false;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private fontLoader: IFontLoaderService
    ) {
        this.applyIconStyles();
        this.initializeFontLoading();
    }

    /**
     * Initialize font loading using the reusable FontLoader service
     */
    private initializeFontLoading(): void {
        // Register the Material Icons font family with the loader
        this.fontLoader.registerFontFamily(MATERIAL_ICONS.FONT_FAMILY);
    }



    public create(props: IconProps): HTMLElement {
        try {
            const {name, color, size, className, ariaHidden = true} = props;

            // Create icon element
            const iconElement = this.domService.createElement('span');
            this.domService.addClass(iconElement, 'material-icons');
            this.domService.addClass(iconElement, 'eksi-icon');

            // Check font loading status and handle accordingly
            if (!this.fontLoader.isFontLoaded(MATERIAL_ICONS.FONT_FAMILY)) {
                // Register element for font loading updates
                this.fontLoader.registerPendingElement(iconElement, 'eksi-icon-loading', 'eksi-icon-loaded');
            } else {
                // If the font is already loaded, add the loaded class for transitions
                this.domService.addClass(iconElement, 'eksi-icon-loaded');
            }

            // Add size class
            if (typeof size === 'string') {
                this.domService.addClass(iconElement, `eksi-icon-${size}`);
            } else if (typeof size === 'number') {
                iconElement.style.fontSize = `${size}px`;
            }

            // Add custom class if provided
            if (className) {
                this.domService.addClass(iconElement, className);
            }

            // Set color if provided
            if (color) {
                iconElement.style.color = color;
            }

            // Set aria-hidden for accessibility
            if (ariaHidden) {
                iconElement.setAttribute('aria-hidden', 'true');
            }

            // Set icon content
            iconElement.textContent = name;

            return iconElement;
        } catch (error) {
          this.loggingService.error('Error creating icon:', error);
            // Return fallback element
            const fallbackElement = this.domService.createElement('span');
            fallbackElement.textContent = props.name;
            return fallbackElement;
        }
    }

    /**
     * Transition an existing icon to a new icon with animation
     */
    public transitionTo(
        iconElement: HTMLElement,
        newIconName: string,
        newColor?: string,
        options: IconTransitionOptions = {}
    ): void {
        if (!iconElement) return;

        const {
            duration = 2000,
            animation = 'fade',
            onComplete
        } = options;

        try {
            // Save original values for reference
            const originalName = iconElement.textContent || '';
            const originalColor = iconElement.style.color;

            // Add the transition class to trigger CSS animations
            this.domService.addClass(iconElement, 'eksi-icon-transitioning');

            // Apply specific animation class
            if (animation !== 'none') {
                this.domService.addClass(iconElement, `eksi-icon-animation-${animation}`);
            }

            // Handle different animation types
            if (animation === 'fade') {
                // For fade animation, apply a CSS transition
                iconElement.style.opacity = '0';

                // Use requestAnimationFrame to ensure smooth transition
                requestAnimationFrame(() => {
                    // Wait a tiny bit for the opacity to take effect
                    setTimeout(() => {
                        // Change the icon and color
                        iconElement.textContent = newIconName;
                        if (newColor) iconElement.style.color = newColor;

                        // Use requestAnimationFrame again to ensure the browser processes the change
                        requestAnimationFrame(() => {
                            // Fade back in
                            iconElement.style.opacity = '1';
                        });
                    }, 150); // Short delay to ensure the fade-out completes
                });
            } else {
                // For other animations (scale, rotate), change immediately
                requestAnimationFrame(() => {
                    iconElement.textContent = newIconName;
                    if (newColor) iconElement.style.color = newColor;
                });
            }

            // Clean up animation classes and call completion callback
            const cleanupTimer = setTimeout(() => {
                // Remove animation classes
                if (animation !== 'none') {
                    this.domService.removeClass(iconElement, `eksi-icon-animation-${animation}`);
                }

                // Remove the transitioning class
                this.domService.removeClass(iconElement, 'eksi-icon-transitioning');

                // Reset opacity explicitly in case it was modified
                iconElement.style.opacity = '1';

                // Call completion callback if provided
                if (onComplete) {
                    onComplete();
                }
            }, duration);

            // Store the timer ID on the element to allow cancellation if needed
            (iconElement as any)._eksiTimerId = cleanupTimer;
        } catch (error) {
          this.loggingService.error('Error transitioning icon:', error);

            // Ensure the icon is still visible in case of error
            iconElement.style.opacity = '1';
            if (newIconName) iconElement.textContent = newIconName;
            if (newColor) iconElement.style.color = newColor;
        }
    }

    /**
     * Create a success icon (check mark)
     */
    public createSuccessIcon(size?: 'small' | 'medium' | 'large' | number): HTMLElement {
        return this.create({
            name: 'check_circle',
            color: '#43a047',
            size: size || 'small'
        });
    }

    /**
     * Create an error icon
     */
    public createErrorIcon(size?: 'small' | 'medium' | 'large' | number): HTMLElement {
        return this.create({
            name: 'error',
            color: '#e53935',
            size: size || 'small'
        });
    }

    /**
     * Show temporary success state for an icon
     */
    public showSuccessState(iconElement: HTMLElement, duration: number = 2000, successIcon: string = 'check_circle'): void {
        if (!iconElement) return;

        // Cancel any existing transition
        if ((iconElement as any)._eksiTimerId) {
            clearTimeout((iconElement as any)._eksiTimerId);
        }

        // Store original state
        const originalName = iconElement.textContent || '';
        const originalColor = iconElement.style.color;
        const originalTransition = iconElement.style.transition;

        // Set a smooth transition
        iconElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        // Transition to success state
        this.transitionTo(iconElement, successIcon, '#43a047', {
            duration,
            animation: 'scale',
            onComplete: () => {
                // Ensure we have a smooth transition back
                iconElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

                // Revert back to original with a smooth transition
                this.transitionTo(iconElement, originalName, originalColor, {
                    duration: 300,
                    animation: 'fade',
                    onComplete: () => {
                        // Restore original transition setting
                        iconElement.style.transition = originalTransition;
                    }
                });
            }
        });
    }

    /**
     * Show temporary error state for an icon
     */
    public showErrorState(iconElement: HTMLElement, duration: number = 2000): void {
        if (!iconElement) return;

        // Cancel any existing transition
        if ((iconElement as any)._eksiTimerId) {
            clearTimeout((iconElement as any)._eksiTimerId);
        }

        // Store original state
        const originalName = iconElement.textContent || '';
        const originalColor = iconElement.style.color;
        const originalTransition = iconElement.style.transition;

        // Set a smooth transition
        iconElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        // Transition to error state
        this.transitionTo(iconElement, 'error', '#e53935', {
            duration,
            animation: 'scale',
            onComplete: () => {
                // Ensure we have a smooth transition back
                iconElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

                // Revert back to original with a smooth transition
                this.transitionTo(iconElement, originalName, originalColor, {
                    duration: 300,
                    animation: 'fade',
                    onComplete: () => {
                        // Restore original transition setting
                        iconElement.style.transition = originalTransition;
                    }
                });
            }
        });
    }

    /**
     * Apply CSS styles for icons and animations
     */
    private applyIconStyles(): void {
        // Only apply styles once across all instances
        if (IconComponent.stylesApplied) return;

        const iconStyles = `
            .eksi-icon {
                font-family: '${MATERIAL_ICONS.FONT_FAMILY}';
                font-weight: normal;
                font-style: normal;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: middle;
                line-height: 1;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                /* Use a more pronounced transition for all properties */
                transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                            opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                            background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Initial loading state - invisible until font is loaded */
            .eksi-icon-loading {
                opacity: 0;
                transform: scale(0.8);
            }
            
            /* Loaded state - fade in smoothly */
            .eksi-icon-loaded {
                opacity: 1;
                transform: scale(1);
                transition: opacity 0.4s ease-out, transform 0.4s ease-out;
            }
            
            /* When actively transitioning between states */
            .eksi-icon-transitioning {
                will-change: transform, opacity, color;
            }
            
            .eksi-icon-small {
                font-size: 16px !important;
            }
            
            .eksi-icon-medium {
                font-size: 24px !important;
            }
            
            .eksi-icon-large {
                font-size: 32px !important;
            }
            
            /* Improved Animation classes */
            .eksi-icon-animation-fade {
                transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                            color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .eksi-icon-animation-scale {
                animation: eksiIconScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            .eksi-icon-animation-rotate {
                animation: eksiIconRotate 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Enhanced animations with better cubic-bezier curves for smoother motion */
            @keyframes eksiIconScale {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); }
                100% { transform: scale(1); }
            }
            
            @keyframes eksiIconRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Loading spinner animation for initial icon state */
            @keyframes eksiIconPulse {
                0% { opacity: 0.6; transform: scale(0.85); }
                50% { opacity: 0.8; transform: scale(0.95); }
                100% { opacity: 0.6; transform: scale(0.85); }
            }
            
            /* Add a subtle pulse animation for loading state */
            .eksi-icon-loading {
                animation: eksiIconPulse 1.5s ease-in-out infinite;
            }
        `;

        this.cssService.addCSS(iconStyles);
        IconComponent.stylesApplied = true;
    }
}