import {ICSSService} from "../../interfaces/services/ICSSService";
import {ILoggingService} from "../../interfaces/services/ILoggingService";
import {IDOMService} from "../../interfaces/services/IDOMService";
import {ButtonProps, ButtonSize, ButtonVariant, IButtonComponent} from "../../interfaces/components/IButtonComponent";

/**
 * Button Component
 * Reusable button component for creating consistent buttons across the extension
 */
export class ButtonComponent implements IButtonComponent {
    private buttonElement: HTMLButtonElement | null = null;
    private static stylesApplied = false;

    /**
     * Constructor
     */
    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
    ) {
        this.applyButtonStyles();
    }

    /**
     * Create button element
     */
    public create(props: ButtonProps): HTMLButtonElement {
        try {
            // Create button element
            this.buttonElement = this.domHandler.createElement('button');

            // Add base class
            this.domHandler.addClass(this.buttonElement, 'eksi-button');

            // Add variant class
            const variant = props.variant || ButtonVariant.DEFAULT;
            this.domHandler.addClass(this.buttonElement, `eksi-button-${variant}`);

            // Add size class
            const size = props.size || ButtonSize.MEDIUM;
            this.domHandler.addClass(this.buttonElement, `eksi-button-${size}`);

            // Add full width class if needed
            if (props.fullWidth) {
                this.domHandler.addClass(this.buttonElement, 'eksi-button-full-width');
            }

            // Add custom class if provided
            if (props.className) {
                this.domHandler.addClass(this.buttonElement, props.className);
            }

            // Add aria label if provided
            if (props.ariaLabel) {
                this.buttonElement.setAttribute('aria-label', props.ariaLabel);
            }

            // Set disabled state if needed
            if (props.disabled) {
                this.buttonElement.disabled = true;
                this.domHandler.addClass(this.buttonElement, 'eksi-button-disabled');
            }

            // Create button content
            this.setButtonContent(props);

            // Add click event listener if provided
            if (props.onClick && !props.disabled) {
                this.domHandler.addEventListener(this.buttonElement, 'click', props.onClick);
            }

            return this.buttonElement;
        } catch (error) {
          this.loggingService.error('Error creating button:', error);
            // Return a fallback button in case of error
            const fallbackButton = this.domHandler.createElement('button');
            fallbackButton.textContent = props.text;
            return fallbackButton;
        }
    }

    /**
     * Set button content (text and icon)
     */
    private setButtonContent(props: ButtonProps): void {
        const iconPosition = props.iconPosition || 'left';

        // Clear button content first
        if (this.buttonElement) {
            this.buttonElement.innerHTML = '';
        }

        // Add icon if provided
        if (props.icon) {
            const iconElement = this.createIconElement(props.icon);

            if (iconPosition === 'left') {
                this.domHandler.appendChild(this.buttonElement!, iconElement);
                this.addTextContent(props.text);
            } else {
                this.addTextContent(props.text);
                this.domHandler.appendChild(this.buttonElement!, iconElement);
            }

            // Add class for icon position
            this.domHandler.addClass(this.buttonElement!, `eksi-button-icon-${iconPosition}`);
        } else {
            // Just add text content
            this.addTextContent(props.text);
        }
    }

    /**
     * Create icon element for material icons
     */
    private createIconElement(iconName: string): HTMLSpanElement {
        const iconElement = this.domHandler.createElement('span');
        this.domHandler.addClass(iconElement, 'material-icons');
        iconElement.setAttribute('aria-hidden', 'true');
        iconElement.textContent = iconName;
        return iconElement;
    }

    /**
     * Add text content to button
     */
    private addTextContent(text: string): void {
        const textNode = document.createTextNode(text);
        this.domHandler.appendChild(this.buttonElement!, textNode);
    }

    /**
     * Update button text
     */
    public updateText(text: string): void {
        if (!this.buttonElement) return;

        // Find and update text node (preserve icon if exists)
        const childNodes = this.buttonElement.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            if (childNodes[i].nodeType === Node.TEXT_NODE) {
                childNodes[i].textContent = text;
                return;
            }
        }

        // If no text node found, just append the text
        this.addTextContent(text);
    }

    /**
     * Set disabled state
     */
    public setDisabled(disabled: boolean): void {
        if (!this.buttonElement) return;

        this.buttonElement.disabled = disabled;

        if (disabled) {
            this.domHandler.addClass(this.buttonElement, 'eksi-button-disabled');
        } else {
            this.domHandler.removeClass(this.buttonElement, 'eksi-button-disabled');
        }
    }

    /**
     * Set loading state
     */
    public setLoading(loading: boolean, loadingText?: string): void {
        if (!this.buttonElement) return;

        if (loading) {
            // Disable button during loading
            this.setDisabled(true);

            // Add loading class
            this.domHandler.addClass(this.buttonElement, 'eksi-button-loading');

            // Store original text as data attribute
            const originalText = this.buttonElement.textContent || '';
            this.buttonElement.setAttribute('data-original-text', originalText);

            // Update text if loading text is provided
            if (loadingText) {
                this.updateText(loadingText);
            }

            // Add loading spinner
            const spinnerElement = this.domHandler.createElement('span');
            this.domHandler.addClass(spinnerElement, 'eksi-button-spinner');
            this.buttonElement.prepend(spinnerElement);
        } else {
            // Remove loading class
            this.domHandler.removeClass(this.buttonElement, 'eksi-button-loading');

            // Remove spinner
            const spinner = this.buttonElement.querySelector('.eksi-button-spinner');
            if (spinner) {
                this.domHandler.removeChild(this.buttonElement, spinner);
            }

            // Restore original text
            const originalText = this.buttonElement.getAttribute('data-original-text');
            if (originalText) {
                this.updateText(originalText);
                this.buttonElement.removeAttribute('data-original-text');
            }

            // Re-enable button
            this.setDisabled(false);
        }
    }

    /**
     * Apply CSS styles for buttons
     */
    private applyButtonStyles(): void {
        // Only apply styles once across all instances
        if (ButtonComponent.stylesApplied) return;

        const buttonStyles = `
      /* Base button styles */
      .eksi-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-weight: 500;
        text-align: center;
        text-decoration: none;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        user-select: none;
        white-space: nowrap;
      }
      
      /* Button size variants */
      .eksi-button-small {
        padding: 6px 12px;
        font-size: 12px;
        height: 30px;
      }
      
      .eksi-button-medium {
        padding: 8px 16px;
        font-size: 14px;
        height: 36px;
      }
      
      .eksi-button-large {
        padding: 10px 20px;
        font-size: 16px;
        height: 44px;
      }
      
      /* Button variants */
      .eksi-button-default {
        background-color: #f5f5f5;
        color: #333;
        border: 1px solid #e0e0e0;
      }
      
      .eksi-button-default:hover {
        background-color: #e8e8e8;
        transform: translateY(-1px);
      }
      
      .eksi-button-default:active {
        background-color: #e0e0e0;
        transform: translateY(0);
      }
      
      .eksi-button-primary {
        background-color: #81c14b;
        color: white;
        box-shadow: 0 2px 5px rgba(129, 193, 75, 0.3);
      }
      
      .eksi-button-primary:hover {
        background-color: #72ad42;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(129, 193, 75, 0.4);
      }
      
      .eksi-button-primary:active {
        background-color: #699e3e;
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(129, 193, 75, 0.4);
      }
      
      .eksi-button-secondary {
        background-color: #ff7063;
        color: white;
        box-shadow: 0 2px 5px rgba(255, 112, 99, 0.3);
      }
      
      .eksi-button-secondary:hover {
        background-color: #f05a4f;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(255, 112, 99, 0.4);
      }
      
      .eksi-button-secondary:active {
        background-color: #e55246;
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(255, 112, 99, 0.4);
      }
      
      .eksi-button-danger {
        background-color: #e53935;
        color: white;
        box-shadow: 0 2px 5px rgba(229, 57, 53, 0.3);
      }
      
      .eksi-button-danger:hover {
        background-color: #d32f2f;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(229, 57, 53, 0.4);
      }
      
      .eksi-button-danger:active {
        background-color: #c62828;
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(229, 57, 53, 0.4);
      }
      
      .eksi-button-success {
        background-color: #43a047;
        color: white;
        box-shadow: 0 2px 5px rgba(67, 160, 71, 0.3);
      }
      
      .eksi-button-success:hover {
        background-color: #388e3c;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(67, 160, 71, 0.4);
      }
      
      .eksi-button-success:active {
        background-color: #2e7d32;
        transform: translateY(0);
        box-shadow: 0 2px 3px rgba(67, 160, 71, 0.4);
      }
      
      /* Disabled state */
      .eksi-button-disabled,
      .eksi-button-disabled:hover,
      .eksi-button-disabled:active {
        background-color: #f0f0f0;
        color: #999;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
        border-color: #e0e0e0;
      }
      
      /* Full width */
      .eksi-button-full-width {
        width: 100%;
      }
      
      /* Icon positioning */
      .eksi-button-icon-left .material-icons {
        margin-right: 8px;
        font-size: 18px;
        display: flex;
        align-items: center;
      }
      
      .eksi-button-icon-right .material-icons {
        margin-left: 8px;
        font-size: 18px;
        display: flex;
        align-items: center;
      }
      
      /* Loading state */
      .eksi-button-loading {
        cursor: wait;
      }
      
      .eksi-button-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: eksi-button-spin 0.8s linear infinite;
        margin-right: 8px;
      }
      
      .eksi-button-default .eksi-button-spinner {
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #555;
      }
      
      @keyframes eksi-button-spin {
        to {
          transform: rotate(360deg);
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .eksi-button-default {
          background-color: #444;
          color: #e0e0e0;
          border-color: #555;
        }
        
        .eksi-button-default:hover {
          background-color: #505050;
        }
        
        .eksi-button-default:active {
          background-color: #555;
        }
        
        .eksi-button-disabled,
        .eksi-button-disabled:hover,
        .eksi-button-disabled:active {
          background-color: #383838;
          color: #777;
          border-color: #444;
        }
      }
    `;

        this.cssHandler.addCSS(buttonStyles);
        ButtonComponent.stylesApplied = true;
    }
}