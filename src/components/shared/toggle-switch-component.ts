import { ICSSService } from '../../interfaces/services/ICSSService';
import { IDOMService } from '../../interfaces/services/IDOMService';
import {ILoggingService} from '../../interfaces/services/ILoggingService';
import {IToggleSwitchComponent} from "../../interfaces/components/IToggleSwitchComponent";

/**
 * Toggle Switch Properties Interface
 */
export interface ToggleSwitchProps {
    id: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    labelPosition?: 'left' | 'right';
    size?: 'small' | 'medium' | 'large';
    ariaLabel?: string;
    className?: string;
    onChange?: (checked: boolean) => void;
}

/**
 * Toggle Switch Component
 * Reusable toggle switch component for creating consistent toggle switches across the extension
 */
export class ToggleSwitchComponent implements IToggleSwitchComponent {
    private containerElement: HTMLElement | null = null;
    private inputElement: HTMLInputElement | null = null;
    private labelElement: HTMLLabelElement | null = null;
    private static stylesApplied = false;

    /**
     * Constructor
     */
    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService
    ) {
        this.applyToggleSwitchStyles();
    }

    /**
     * Create toggle switch element
     */
    public create(props: ToggleSwitchProps): HTMLElement {
        try {
            // Create container element
            this.containerElement = this.domService.createElement('div');
            this.domService.addClass(this.containerElement, 'eksi-toggle-container');

            // Add custom class if provided
            if (props.className) {
                this.domService.addClass(this.containerElement, props.className);
            }

            // Create toggle switch wrapper
            const toggleWrapper = this.domService.createElement('div');
            this.domService.addClass(toggleWrapper, 'eksi-toggle-switch');

            // Add size class if provided
            if (props.size) {
                this.domService.addClass(toggleWrapper, `eksi-toggle-${props.size}`);
            }

            // Create input element
            this.inputElement = this.domService.createElement('input');
            this.inputElement.type = 'checkbox';
            this.inputElement.id = props.id;

            // Set checked state if provided
            if (props.checked) {
                this.inputElement.checked = props.checked;
            }

            // Set disabled state if provided
            if (props.disabled) {
                this.inputElement.disabled = props.disabled;
                this.domService.addClass(toggleWrapper, 'eksi-toggle-disabled');
            }

            // Set aria attributes
            if (props.ariaLabel) {
                this.inputElement.setAttribute('aria-label', props.ariaLabel);
            }

            // Create slider element
            const sliderElement = this.domService.createElement('span');
            this.domService.addClass(sliderElement, 'eksi-toggle-slider');

            // Add elements to toggle wrapper
            this.domService.appendChild(toggleWrapper, this.inputElement);
            this.domService.appendChild(toggleWrapper, sliderElement);

            // Create label if provided
            if (props.label) {
                this.labelElement = this.domService.createElement('label');
                this.labelElement.htmlFor = props.id;
                this.labelElement.textContent = props.label;
                this.domService.addClass(this.labelElement, 'eksi-toggle-label');
            }

            // Arrange elements based on label position
            const labelPosition = props.labelPosition || 'right';
            if (labelPosition === 'left' && this.labelElement) {
                this.domService.appendChild(this.containerElement, this.labelElement);
                this.domService.appendChild(this.containerElement, toggleWrapper);
                this.domService.addClass(this.containerElement, 'eksi-toggle-label-left');
            } else {
                this.domService.appendChild(this.containerElement, toggleWrapper);
                if (this.labelElement) {
                    this.domService.appendChild(this.containerElement, this.labelElement);
                }
                this.domService.addClass(this.containerElement, 'eksi-toggle-label-right');
            }

            // Add change event listener if provided
            if (props.onChange && this.inputElement) {
                this.domService.addEventListener(this.inputElement, 'change', () => {
                    if (props.onChange && this.inputElement) {
                        props.onChange(this.inputElement.checked);
                    }
                });
            }

            return this.containerElement;
        } catch (error) {
          this.loggingService.error('Error creating toggle switch:', error);
            // Return a fallback element in case of error
            const fallbackElement = this.domService.createElement('div');
            fallbackElement.textContent = props.label || 'Toggle Switch';
            return fallbackElement;
        }
    }

    /**
     * Set checked state
     */
    public setChecked(checked: boolean): void {
        if (this.inputElement) {
            this.inputElement.checked = checked;
        }
    }

    /**
     * Get checked state
     */
    public isChecked(): boolean {
        return this.inputElement ? this.inputElement.checked : false;
    }

    /**
     * Set disabled state
     */
    public setDisabled(disabled: boolean): void {
        if (!this.inputElement || !this.containerElement) return;

        this.inputElement.disabled = disabled;

        if (disabled) {
            this.domService.addClass(this.containerElement, 'eksi-toggle-disabled');
        } else {
            this.domService.removeClass(this.containerElement, 'eksi-toggle-disabled');
        }
    }

    /**
     * Apply CSS styles for toggle switch
     */
    private applyToggleSwitchStyles(): void {
        // Only apply styles once across all instances
        if (ToggleSwitchComponent.stylesApplied) return;

        const toggleSwitchStyles = `
      /* Container styles */
      .eksi-toggle-container {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      }
      
      .eksi-toggle-label-left {
        flex-direction: row;
      }
      
      .eksi-toggle-label-right {
        flex-direction: row-reverse;
        justify-content: flex-end;
      }
      
      /* Toggle switch styles */
      .eksi-toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
        flex-shrink: 0;
        margin: 0 5px;
      }
      
      /* Size variants */
      .eksi-toggle-small {
        width: 40px;
        height: 20px;
      }
      
      .eksi-toggle-large {
        width: 60px;
        height: 30px;
      }
      
      /* Hide default input */
      .eksi-toggle-switch input {
        opacity: 0;
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: 1;
        cursor: pointer;
        margin: 0;
        left: 0;
      }
      
      /* Slider styles */
      .eksi-toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .3s;
        border-radius: 24px;
        pointer-events: none;
      }
      
      /* Slider thumb */
      .eksi-toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s ease, background-color 0.3s ease;
      }
      
      /* Small size thumb */
      .eksi-toggle-small .eksi-toggle-slider:before {
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
      }
      
      /* Large size thumb */
      .eksi-toggle-large .eksi-toggle-slider:before {
        height: 22px;
        width: 22px;
        left: 4px;
        bottom: 4px;
      }
      
      /* Checked state */
      .eksi-toggle-switch input:checked + .eksi-toggle-slider {
        background-color: #81c14b;
      }
      
      /* Focus state */
      .eksi-toggle-switch input:focus + .eksi-toggle-slider {
        box-shadow: 0 0 1px #81c14b;
      }
      
      /* Move thumb when checked */
      .eksi-toggle-switch input:checked + .eksi-toggle-slider:before {
        transform: translateX(26px);
      }
      
      /* Small size movement */
      .eksi-toggle-small input:checked + .eksi-toggle-slider:before {
        transform: translateX(20px);
      }
      
      /* Large size movement */
      .eksi-toggle-large input:checked + .eksi-toggle-slider:before {
        transform: translateX(30px);
      }
      
      /* Disabled state */
      .eksi-toggle-disabled {
        opacity: 0.6;
      }
      
      .eksi-toggle-disabled input {
        cursor: not-allowed;
      }
      
      .eksi-toggle-disabled .eksi-toggle-slider {
        cursor: not-allowed;
      }
      
      /* Label styles */
      .eksi-toggle-label {
        margin: 0 12px;
        font-weight: 500;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        cursor: pointer;
      }
      
      .eksi-toggle-label-left .eksi-toggle-label {
        margin-right: 12px;
        margin-left: 0;
      }
      
      .eksi-toggle-label-right .eksi-toggle-label {
        margin-left: 12px;
        margin-right: 0;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .eksi-toggle-label {
          color: #e0e0e0;
        }
      }
    `;

        this.cssService.addCSS(toggleSwitchStyles);
        ToggleSwitchComponent.stylesApplied = true;
    }
}