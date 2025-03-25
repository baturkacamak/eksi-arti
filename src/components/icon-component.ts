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
    `;

        this.cssHandler.addCSS(iconStyles);
        IconComponent.stylesApplied = true;
    }
}