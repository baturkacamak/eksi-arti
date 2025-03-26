import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { logError } from '../services/logging-service';

export interface IconProps {
    name: string;
    color?: string;
    size?: 'small' | 'medium' | 'large' | number;
    className?: string;
    ariaHidden?: boolean;
}

export interface IconTransitionOptions {
    duration?: number;  // Duration in milliseconds
    animation?: 'none' | 'fade' | 'scale' | 'rotate';
    onComplete?: () => void;
}

export class IconComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private static stylesApplied = false;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.applyIconStyles();
    }

    public create(props: IconProps): HTMLElement {
        try {
            const { name, color, size, className, ariaHidden = true } = props;

            // Create icon element
            const iconElement = this.domHandler.createElement('span');
            this.domHandler.addClass(iconElement, 'material-icons');
            this.domHandler.addClass(iconElement, 'eksi-icon');

            // Add size class
            if (typeof size === 'string') {
                this.domHandler.addClass(iconElement, `eksi-icon-${size}`);
            } else if (typeof size === 'number') {
                iconElement.style.fontSize = `${size}px`;
            }

            // Add custom class if provided
            if (className) {
                this.domHandler.addClass(iconElement, className);
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
            logError('Error creating icon:', error);
            // Return fallback element
            const fallbackElement = this.domHandler.createElement('span');
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
            // Save original values for reverting later
            const originalName = iconElement.textContent || '';
            const originalColor = iconElement.style.color;

            // Apply animation class
            if (animation !== 'none') {
                this.domHandler.addClass(iconElement, `eksi-icon-animation-${animation}`);
            }

            // Update to new icon and color
            if (animation === 'fade') {
                // For fade animation, we need to fade out first
                iconElement.style.opacity = '0';

                setTimeout(() => {
                    // Change icon and color when faded out
                    iconElement.textContent = newIconName;
                    if (newColor) iconElement.style.color = newColor;

                    // Fade back in
                    setTimeout(() => {
                        iconElement.style.opacity = '1';
                    }, 50);
                }, 200);
            } else {
                // For other animations, change immediately
                iconElement.textContent = newIconName;
                if (newColor) iconElement.style.color = newColor;
            }

            // Set timeout to revert back or call completion handler
            setTimeout(() => {
                // Remove animation class
                if (animation !== 'none') {
                    this.domHandler.removeClass(iconElement, `eksi-icon-animation-${animation}`);
                }

                // Call completion callback if provided
                if (onComplete) {
                    onComplete();
                }
            }, duration);
        } catch (error) {
            logError('Error transitioning icon:', error);
        }
    }

    /**
     * Create a success icon (check mark)
     */
    public createSuccessIcon(size?: 'small' | 'medium' | 'large' | number): HTMLElement {
        return this.create({
            name: 'check',
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
    public showSuccessState(iconElement: HTMLElement, duration: number = 2000): void {
        if (!iconElement) return;

        const originalName = iconElement.textContent || '';
        const originalColor = iconElement.style.color;

        // Transition to success state
        this.transitionTo(iconElement, 'check', '#43a047', {
            duration,
            animation: 'scale',
            onComplete: () => {
                // Revert back to original
                iconElement.textContent = originalName;
                iconElement.style.color = originalColor;
            }
        });
    }

    /**
     * Show temporary error state for an icon
     */
    public showErrorState(iconElement: HTMLElement, duration: number = 2000): void {
        if (!iconElement) return;

        const originalName = iconElement.textContent || '';
        const originalColor = iconElement.style.color;

        // Transition to error state
        this.transitionTo(iconElement, 'error', '#e53935', {
            duration,
            animation: 'scale',
            onComplete: () => {
                // Revert back to original
                iconElement.textContent = originalName;
                iconElement.style.color = originalColor;
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
                font-family: 'Material Icons';
                font-weight: normal;
                font-style: normal;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: middle;
                line-height: 1;
                transition: color 0.3s ease, transform 0.3s ease, opacity 0.3s ease;
            }
            
            .eksi-icon-small {
                font-size: 16px;
            }
            
            .eksi-icon-medium {
                font-size: 24px;
            }
            
            .eksi-icon-large {
                font-size: 32px;
            }
            
            /* Animation classes */
            .eksi-icon-animation-fade {
                transition: opacity 0.2s ease, color 0.2s ease;
            }
            
            .eksi-icon-animation-scale {
                transition: transform 0.3s ease, color 0.3s ease;
            }
            
            .eksi-icon-animation-scale {
                animation: eksiIconScale 0.5s ease;
            }
            
            .eksi-icon-animation-rotate {
                animation: eksiIconRotate 0.5s ease;
            }
            
            @keyframes eksiIconScale {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); }
                100% { transform: scale(1); }
            }
            
            @keyframes eksiIconRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        this.cssHandler.addCSS(iconStyles);
        IconComponent.stylesApplied = true;
    }
}