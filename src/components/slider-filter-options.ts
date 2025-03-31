/**
 * SliderFilterComponent
 * A reusable slider component for filtering numeric values
 */
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import {LoggingService} from '../services/logging-service';
import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";

export interface SliderFilterOptions {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    dualValue?: boolean;
    valueMin?: number;
    valueMax?: number;
    label?: string;
    showValueLabel?: boolean;
    valueLabelFormat?: (value: number) => string;
    onChange?: (value: number | [number, number]) => void;
    className?: string;
    tooltips?: boolean;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
    theme?: 'default' | 'light' | 'dark';
}

export class SliderFilterComponent {
    private domHandler: IDOMService;
    private cssHandler: ICSSService;
    private containerElement: HTMLElement | null = null;
    private sliderElement: HTMLInputElement | null = null;
    private secondSliderElement: HTMLInputElement | null = null;
    private valueLabelElement: HTMLElement | null = null;
    private trackElement: HTMLElement | null = null;
    private progressElement: HTMLElement | null = null;
    private options: SliderFilterOptions = {};
    private static stylesApplied = false;
    private loggingService: ILoggingService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.loggingService = new LoggingService();
        this.applySliderStyles();
    }

    /**
     * Create a new slider filter
     */
    create(options: SliderFilterOptions = {}): HTMLElement {
        try {
            // Set default options
            this.options = {
                min: 0,
                max: 100,
                step: 1,
                value: 50,
                valueMin: 25,
                valueMax: 75,
                dualValue: false,
                label: '',
                showValueLabel: true,
                tooltips: false,
                orientation: 'horizontal',
                disabled: false,
                theme: 'default',
                ...options
            };

            // Create container element
            this.containerElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.containerElement, 'eksi-slider-container');

            // Add custom class if provided
            if (this.options.className) {
                this.domHandler.addClass(this.containerElement, this.options.className);
            }

            // Add theme class
            this.domHandler.addClass(this.containerElement, `eksi-slider-theme-${this.options.theme}`);

            // Add orientation class
            this.domHandler.addClass(this.containerElement, `eksi-slider-${this.options.orientation}`);

            // Add disabled class if needed
            if (this.options.disabled) {
                this.domHandler.addClass(this.containerElement, 'eksi-slider-disabled');
            }

            // Create label if provided
            if (this.options.label) {
                const labelElement = this.domHandler.createElement('div');
                this.domHandler.addClass(labelElement, 'eksi-slider-label');
                labelElement.textContent = this.options.label;
                this.domHandler.appendChild(this.containerElement, labelElement);
            }

            // Create slider track container
            const trackContainer = this.domHandler.createElement('div');
            this.domHandler.addClass(trackContainer, 'eksi-slider-track-container');

            // Create the slider track
            this.trackElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.trackElement, 'eksi-slider-track');

            // Create progress element inside track
            this.progressElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.progressElement, 'eksi-slider-progress');
            this.domHandler.appendChild(this.trackElement, this.progressElement);

            // Append track to container
            this.domHandler.appendChild(trackContainer, this.trackElement);

            if (this.options.dualValue) {
                // Create first slider input for min value
                this.sliderElement = this.createSliderInput('min');
                this.domHandler.appendChild(trackContainer, this.sliderElement);

                // Create second slider input for max value
                this.secondSliderElement = this.createSliderInput('max');
                this.domHandler.appendChild(trackContainer, this.secondSliderElement);

                // Set initial values
                if (this.sliderElement) this.sliderElement.value = String(this.options.valueMin);
                if (this.secondSliderElement) this.secondSliderElement.value = String(this.options.valueMax);
            } else {
                // Create single slider input
                this.sliderElement = this.createSliderInput('single');
                this.domHandler.appendChild(trackContainer, this.sliderElement);

                // Set initial value
                if (this.sliderElement) this.sliderElement.value = String(this.options.value);
            }

            // Append track container to main container
            this.domHandler.appendChild(this.containerElement, trackContainer);

            // Create value label if needed
            if (this.options.showValueLabel) {
                this.valueLabelElement = this.domHandler.createElement('div');
                this.domHandler.addClass(this.valueLabelElement, 'eksi-slider-value-label');
                this.updateValueLabel();
                this.domHandler.appendChild(this.containerElement, this.valueLabelElement);
            }

            // Initialize slider positions
            this.updateSliderProgress();

            // Add event listeners
            this.addEventListeners();

            return this.containerElement;
        } catch (error) {
          this.loggingService.error('Error creating slider filter:', error);

            // Return a fallback element in case of error
            const fallbackElement = this.domHandler.createElement('div');
            fallbackElement.textContent = 'Slider unavailable';
            return fallbackElement;
        }
    }

    /**
     * Create a slider input element
     */
    private createSliderInput(type: 'single' | 'min' | 'max'): HTMLInputElement {
        const slider = this.domHandler.createElement('input') as HTMLInputElement;
        slider.type = 'range';
        slider.min = String(this.options.min);
        slider.max = String(this.options.max);
        slider.step = String(this.options.step);
        slider.disabled = this.options.disabled || false;

        this.domHandler.addClass(slider, 'eksi-slider-input');

        if (type === 'min') {
            this.domHandler.addClass(slider, 'eksi-slider-min');
            slider.value = String(this.options.valueMin);
        } else if (type === 'max') {
            this.domHandler.addClass(slider, 'eksi-slider-max');
            slider.value = String(this.options.valueMax);
        } else {
            slider.value = String(this.options.value);
        }

        return slider;
    }

    /**
     * Add event listeners to slider inputs
     */
    private addEventListeners(): void {
        if (!this.sliderElement) return;

        // Add input event for live updates
        this.domHandler.addEventListener(this.sliderElement, 'input', () => {
            this.handleSliderInput();
        });

        // Add change event for final value
        this.domHandler.addEventListener(this.sliderElement, 'change', () => {
            this.handleSliderChange();
        });

        // Add listeners for second slider if dual mode
        if (this.options.dualValue && this.secondSliderElement) {
            this.domHandler.addEventListener(this.secondSliderElement, 'input', () => {
                this.handleSliderInput();
            });

            this.domHandler.addEventListener(this.secondSliderElement, 'change', () => {
                this.handleSliderChange();
            });
        }
    }

    /**
     * Handle slider input event (live updates)
     */
    private handleSliderInput(): void {
        this.updateSliderProgress();
        this.updateValueLabel();

        // Call onChange with debounce for better performance
        this.debouncedOnChange();
    }

    /**
     * Handle slider change event (final value)
     */
    private handleSliderChange(): void {
        this.updateSliderProgress();
        this.updateValueLabel();

        // Call onChange callback with final value
        this.triggerOnChange();
    }

    /**
     * Debounced version of onChange callback
     */
    private debouncedOnChange = (() => {
        let timeout: number | null = null;
        return () => {
            if (timeout !== null) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => {
                this.triggerOnChange();
                timeout = null;
            }, 50);
        };
    })();

    /**
     * Trigger onChange callback
     */
    private triggerOnChange(): void {
        if (!this.options.onChange) return;

        if (this.options.dualValue && this.sliderElement && this.secondSliderElement) {
            const minValue = parseFloat(this.sliderElement.value);
            const maxValue = parseFloat(this.secondSliderElement.value);
            this.options.onChange([minValue, maxValue]);
        } else if (this.sliderElement) {
            const value = parseFloat(this.sliderElement.value);
            this.options.onChange(value);
        }
    }

    /**
     * Update slider progress element position
     */
    private updateSliderProgress(): void {
        if (!this.progressElement || !this.sliderElement) return;

        const min = parseFloat(String(this.options.min));
        const max = parseFloat(String(this.options.max));
        const range = max - min;

        if (this.options.dualValue && this.secondSliderElement) {
            const minValue = parseFloat(this.sliderElement.value);
            const maxValue = parseFloat(this.secondSliderElement.value);

            // Ensure min doesn't exceed max
            if (minValue > maxValue) {
                if (this.sliderElement === document.activeElement) {
                    this.secondSliderElement.value = this.sliderElement.value;
                } else {
                    this.sliderElement.value = this.secondSliderElement.value;
                }
            }

            // Calculate percentages for positioning
            const minPercent = ((parseFloat(this.sliderElement.value) - min) / range) * 100;
            const maxPercent = ((parseFloat(this.secondSliderElement.value) - min) / range) * 100;

            // Update progress element position and width
            if (this.options.orientation === 'horizontal') {
                this.progressElement.style.left = `${minPercent}%`;
                this.progressElement.style.width = `${maxPercent - minPercent}%`;
            } else {
                this.progressElement.style.bottom = `${minPercent}%`;
                this.progressElement.style.height = `${maxPercent - minPercent}%`;
            }
        } else {
            // Single slider mode
            const percent = ((parseFloat(this.sliderElement.value) - min) / range) * 100;

            if (this.options.orientation === 'horizontal') {
                this.progressElement.style.width = `${percent}%`;
            } else {
                this.progressElement.style.height = `${percent}%`;
            }
        }
    }

    /**
     * Update value label text
     */
    private updateValueLabel(): void {
        if (!this.valueLabelElement || !this.sliderElement) return;

        if (this.options.dualValue && this.secondSliderElement) {
            const minValue = parseFloat(this.sliderElement.value);
            const maxValue = parseFloat(this.secondSliderElement.value);

            if (this.options.valueLabelFormat) {
                this.valueLabelElement.textContent =
                    `${this.options.valueLabelFormat(minValue)} - ${this.options.valueLabelFormat(maxValue)}`;
            } else {
                this.valueLabelElement.textContent = `${minValue} - ${maxValue}`;
            }
        } else {
            const value = parseFloat(this.sliderElement.value);

            if (this.options.valueLabelFormat) {
                this.valueLabelElement.textContent = this.options.valueLabelFormat(value);
            } else {
                this.valueLabelElement.textContent = String(value);
            }
        }
    }

    /**
     * Get current slider value(s)
     */
    getValue(): number | [number, number] {
        if (this.options.dualValue && this.sliderElement && this.secondSliderElement) {
            return [
                parseFloat(this.sliderElement.value),
                parseFloat(this.secondSliderElement.value)
            ];
        } else if (this.sliderElement) {
            return parseFloat(this.sliderElement.value);
        }

        // Return default values if sliders are not available
        return this.options.dualValue
            ? [this.options.valueMin || 0, this.options.valueMax || 100]
            : this.options.value || 50;
    }

    /**
     * Set slider value(s)
     */
    setValue(value: number | [number, number]): void {
        if (Array.isArray(value) && this.options.dualValue) {
            if (this.sliderElement && this.secondSliderElement) {
                this.sliderElement.value = String(value[0]);
                this.secondSliderElement.value = String(value[1]);
                this.updateSliderProgress();
                this.updateValueLabel();
            }
        } else if (!Array.isArray(value) && !this.options.dualValue && this.sliderElement) {
            this.sliderElement.value = String(value);
            this.updateSliderProgress();
            this.updateValueLabel();
        }
    }

    /**
     * Set disabled state
     */
    setDisabled(disabled: boolean): void {
        if (!this.containerElement) return;

        if (disabled) {
            this.domHandler.addClass(this.containerElement, 'eksi-slider-disabled');
        } else {
            this.domHandler.removeClass(this.containerElement, 'eksi-slider-disabled');
        }

        if (this.sliderElement) {
            this.sliderElement.disabled = disabled;
        }

        if (this.secondSliderElement) {
            this.secondSliderElement.disabled = disabled;
        }

        this.options.disabled = disabled;
    }

    /**
     * Set min/max range
     */
    setRange(min: number, max: number): void {
        if (!this.sliderElement) return;

        this.options.min = min;
        this.options.max = max;

        this.sliderElement.min = String(min);
        this.sliderElement.max = String(max);

        if (this.secondSliderElement) {
            this.secondSliderElement.min = String(min);
            this.secondSliderElement.max = String(max);
        }

        // Update visual elements
        this.updateSliderProgress();
        this.updateValueLabel();
    }

    /**
     * Set step size
     */
    setStep(step: number): void {
        if (!this.sliderElement) return;

        this.options.step = step;
        this.sliderElement.step = String(step);

        if (this.secondSliderElement) {
            this.secondSliderElement.step = String(step);
        }
    }

    /**
     * Set value label format function
     */
    setValueLabelFormat(format: (value: number) => string): void {
        this.options.valueLabelFormat = format;
        this.updateValueLabel();
    }

    /**
     * Apply CSS styles for sliders
     */
    private applySliderStyles(): void {
        // Only apply styles once across all instances
        if (SliderFilterComponent.stylesApplied) return;

        const sliderStyles = `
            /* Slider container */
            .eksi-slider-container {
                position: relative;
                width: 100%;
                margin: 10px 0;
                padding: 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            /* Slider label */
            .eksi-slider-label {
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            
            /* Vertical orientation */
            .eksi-slider-vertical {
                height: 200px;
                width: 40px;
            }
            
            .eksi-slider-vertical .eksi-slider-track-container {
                height: 100%;
            }
            
            /* Track container - holds track and inputs */
            .eksi-slider-track-container {
                position: relative;
                height: 40px;
                display: flex;
                align-items: center;
            }
            
            /* Track element - the visible track line */
            .eksi-slider-track {
                position: absolute;
                background-color: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }
            
            /* Horizontal track */
            .eksi-slider-horizontal .eksi-slider-track {
                height: 6px;
                width: 100%;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
            }
            
            /* Vertical track */
            .eksi-slider-vertical .eksi-slider-track {
                width: 6px;
                height: 100%;
                left: 50%;
                transform: translateX(-50%);
            }
            
            /* Progress indicator within track */
            .eksi-slider-progress {
                position: absolute;
                background-color: #81c14b;
                border-radius: 4px;
            }
            
            /* Horizontal progress */
            .eksi-slider-horizontal .eksi-slider-progress {
                height: 100%;
                left: 0;
            }
            
            /* Vertical progress */
            .eksi-slider-vertical .eksi-slider-progress {
                width: 100%;
                bottom: 0;
            }
            
            /* Dual slider progress (between min and max) */
            .eksi-slider-horizontal .eksi-slider-progress.dual {
                height: 100%;
            }
            
            .eksi-slider-vertical .eksi-slider-progress.dual {
                width: 100%;
            }
            
            /* Input range styling */
            .eksi-slider-input {
                position: absolute;
                width: 100%;
                height: 100%;
                opacity: 0;
                margin: 0;
                z-index: 2;
                cursor: pointer;
            }
            
            /* Value label */
            .eksi-slider-value-label {
                margin-top: 8px;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            
            .eksi-slider-vertical .eksi-slider-value-label {
                margin-top: 0;
                margin-left: 16px;
            }
            
            /* Disabled state */
            .eksi-slider-disabled {
                opacity: 0.6;
                pointer-events: none;
            }
            
            .eksi-slider-disabled .eksi-slider-input {
                cursor: not-allowed;
            }
            
            /* Slider thumb styling - we're actually styling the track but making it appear like we're styling the thumb */
            .eksi-slider-track::before,
            .eksi-slider-track::after {
                content: '';
                position: absolute;
                width: 18px;
                height: 18px;
                background-color: white;
                border: 2px solid #81c14b;
                border-radius: 50%;
                z-index: 1;
                transition: transform 0.2s ease;
            }
            
            /* Single slider thumb */
            .eksi-slider-horizontal .eksi-slider-track::after {
                right: 0;
                top: 50%;
                transform: translate(50%, -50%);
            }
            
            .eksi-slider-horizontal .eksi-slider-track::before {
                display: none; /* Hide in single slider mode */
            }
            
            /* Dual slider thumbs */
            .eksi-slider-container:has(.eksi-slider-min) .eksi-slider-horizontal .eksi-slider-track::before {
                display: block;
                left: 0;
                top: 50%;
                transform: translate(-50%, -50%);
            }
            
            .eksi-slider-container:has(.eksi-slider-max) .eksi-slider-horizontal .eksi-slider-track::after {
                right: 0;
                top: 50%;
                transform: translate(50%, -50%);
            }
            
            /* Vertical thumbs */
            .eksi-slider-vertical .eksi-slider-track::after {
                bottom: 0;
                left: 50%;
                transform: translate(-50%, 50%);
            }
            
            .eksi-slider-vertical .eksi-slider-track::before {
                display: none;
            }
            
            .eksi-slider-container:has(.eksi-slider-min) .eksi-slider-vertical .eksi-slider-track::before {
                display: block;
                top: 0;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .eksi-slider-container:has(.eksi-slider-max) .eksi-slider-vertical .eksi-slider-track::after {
                bottom: 0;
                left: 50%;
                transform: translate(-50%, 50%);
            }
            
            /* Hover and focus states */
            .eksi-slider-input:hover + .eksi-slider-track::before,
            .eksi-slider-input:hover + .eksi-slider-track::after,
            .eksi-slider-input:focus + .eksi-slider-track::before,
            .eksi-slider-input:focus + .eksi-slider-track::after {
                transform: translate(-50%, -50%) scale(1.1);
                box-shadow: 0 0 0 5px rgba(129, 193, 75, 0.2);
            }
            
            .eksi-slider-input.eksi-slider-max:hover + .eksi-slider-track::after,
            .eksi-slider-input.eksi-slider-max:focus + .eksi-slider-track::after {
                transform: translate(50%, -50%) scale(1.1);
            }
            
            /* Theme variations */
            .eksi-slider-theme-light .eksi-slider-label {
                color: #666;
            }
            
            .eksi-slider-theme-light .eksi-slider-track {
                background-color: #f0f0f0;
            }
            
            .eksi-slider-theme-dark .eksi-slider-label {
                color: #e0e0e0;
            }
            
            .eksi-slider-theme-dark .eksi-slider-track {
                background-color: #444;
            }
            
            .eksi-slider-theme-dark .eksi-slider-value-label {
                color: #ccc;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-slider-label {
                    color: #e0e0e0;
                }
                
                .eksi-slider-track {
                    background-color: #444;
                }
                
                .eksi-slider-value-label {
                    color: #ccc;
                }
            }
        `;

        this.cssHandler.addCSS(sliderStyles);
        SliderFilterComponent.stylesApplied = true;
    }
}