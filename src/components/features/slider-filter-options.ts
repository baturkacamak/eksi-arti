/**
 * SliderFilterComponent
 * A reusable slider component for filtering numeric values
 */
import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';

import { ICSSService } from '../../interfaces/services/shared/ICSSService';
import { IDOMService } from '../../interfaces/services/shared/IDOMService';
import { ILoggingService } from '../../interfaces/services/shared/ILoggingService';
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IObserverService } from '../../interfaces/services/shared/IObserverService';

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

export class SliderFilterComponent extends BaseFeatureComponent {
    private containerElement: HTMLElement | null = null;
    private sliderElement: HTMLInputElement | null = null;
    private secondSliderElement: HTMLInputElement | null = null;
    private valueLabelElement: HTMLElement | null = null;
    private trackElement: HTMLElement | null = null;
    private progressElement: HTMLElement | null = null;
    
    // Store the resolved options for the instance
    private instanceOptions: Required<SliderFilterOptions>;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        options: SliderFilterOptions,
        baseOptions?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, baseOptions);
        
        // Set default options and merge with provided options
        this.instanceOptions = {
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
            valueLabelFormat: (val) => String(val), // Default formatter
            onChange: () => {}, // Default empty onChange
            className: '', // Default empty className
            ...options
        };
    }

    protected getStyles(): string | null {
        // Styles from original applySliderStyles method
        return `
            /* Slider container */
            .eksi-slider-container {
                position: relative;
                width: 100%;
                margin: 10px 0;
                padding: 8px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            .eksi-slider-label {
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            .eksi-slider-vertical {
                height: 200px;
                width: 40px;
            }
            .eksi-slider-vertical .eksi-slider-track-container {
                height: 100%;
            }
            .eksi-slider-track-container {
                position: relative;
                height: 40px;
                display: flex;
                align-items: center;
            }
            .eksi-slider-track {
                position: absolute;
                background-color: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }
            .eksi-slider-horizontal .eksi-slider-track {
                height: 6px;
                width: 100%;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
            }
            .eksi-slider-vertical .eksi-slider-track {
                width: 6px;
                height: 100%;
                left: 50%;
                transform: translateX(-50%);
            }
            .eksi-slider-progress {
                position: absolute;
                background-color: #81c14b;
                border-radius: 4px;
            }
            .eksi-slider-horizontal .eksi-slider-progress {
                height: 100%;
                left: 0;
            }
            .eksi-slider-vertical .eksi-slider-progress {
                width: 100%;
                bottom: 0;
            }
            .eksi-slider-input {
                position: absolute;
                width: 100%;
                height: 100%;
                opacity: 0;
                margin: 0;
                z-index: 2;
                cursor: pointer;
            }
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
            .eksi-slider-disabled {
                opacity: 0.6;
                pointer-events: none;
            }
            .eksi-slider-disabled .eksi-slider-input {
                cursor: not-allowed;
            }
            .eksi-slider-theme-light .eksi-slider-label { color: #666; }
            .eksi-slider-theme-light .eksi-slider-track { background-color: #f0f0f0; }
            .eksi-slider-theme-dark .eksi-slider-label { color: #e0e0e0; }
            .eksi-slider-theme-dark .eksi-slider-track { background-color: #444; }
            .eksi-slider-theme-dark .eksi-slider-value-label { color: #ccc; }
            @media (prefers-color-scheme: dark) {
                .eksi-slider-label { color: #e0e0e0; }
                .eksi-slider-track { background-color: #444; }
                .eksi-slider-value-label { color: #ccc; }
            }
        `;
    }

    protected shouldInitialize(): boolean {
        return true; // This component is typically created on demand with options
    }

    protected setupUI(): void {
        try {
            this.containerElement = this.domService.createElement('div');
            this.domService.addClass(this.containerElement, 'eksi-slider-container');

            if (this.instanceOptions.className) {
                this.domService.addClass(this.containerElement, this.instanceOptions.className);
            }
            this.domService.addClass(this.containerElement, `eksi-slider-theme-${this.instanceOptions.theme}`);
            this.domService.addClass(this.containerElement, `eksi-slider-${this.instanceOptions.orientation}`);
            if (this.instanceOptions.disabled) {
                this.domService.addClass(this.containerElement, 'eksi-slider-disabled');
            }

            if (this.instanceOptions.label) {
                const labelElement = this.domService.createElement('div');
                this.domService.addClass(labelElement, 'eksi-slider-label');
                labelElement.textContent = this.instanceOptions.label;
                this.domService.appendChild(this.containerElement, labelElement);
            }

            const trackContainer = this.domService.createElement('div');
            this.domService.addClass(trackContainer, 'eksi-slider-track-container');

            this.trackElement = this.domService.createElement('div');
            this.domService.addClass(this.trackElement, 'eksi-slider-track');

            this.progressElement = this.domService.createElement('div');
            this.domService.addClass(this.progressElement, 'eksi-slider-progress');
            this.domService.appendChild(this.trackElement, this.progressElement);
            this.domService.appendChild(trackContainer, this.trackElement);

            if (this.instanceOptions.dualValue) {
                this.sliderElement = this.createSliderInput('min');
                this.domService.appendChild(trackContainer, this.sliderElement);
                this.secondSliderElement = this.createSliderInput('max');
                this.domService.appendChild(trackContainer, this.secondSliderElement);
                if (this.sliderElement) this.sliderElement.value = String(this.instanceOptions.valueMin);
                if (this.secondSliderElement) this.secondSliderElement.value = String(this.instanceOptions.valueMax);
            } else {
                this.sliderElement = this.createSliderInput('single');
                this.domService.appendChild(trackContainer, this.sliderElement);
                if (this.sliderElement) this.sliderElement.value = String(this.instanceOptions.value);
            }

            this.domService.appendChild(this.containerElement, trackContainer);

            if (this.instanceOptions.showValueLabel) {
                this.valueLabelElement = this.domService.createElement('div');
                this.domService.addClass(this.valueLabelElement, 'eksi-slider-value-label');
                this.domService.appendChild(this.containerElement, this.valueLabelElement);
                this.updateValueLabel(); // Initial update
            }
            
            this.updateSliderProgress(); // Initial update
            this.addEventListeners();

        } catch (error) {
            this.loggingService.error('Error setting up slider UI:', error);
            // Create a fallback element if UI setup fails
            this.containerElement = this.domService.createElement('div');
            this.containerElement.textContent = 'Slider UI Error';
        }
    }

    private createSliderInput(type: 'single' | 'min' | 'max'): HTMLInputElement {
        const slider = this.domService.createElement('input') as HTMLInputElement;
        slider.type = 'range';
        slider.min = String(this.instanceOptions.min);
        slider.max = String(this.instanceOptions.max);
        slider.step = String(this.instanceOptions.step);
        slider.disabled = this.instanceOptions.disabled || false;
        this.domService.addClass(slider, 'eksi-slider-input');

        if (type === 'min') {
            this.domService.addClass(slider, 'eksi-slider-min');
            slider.value = String(this.instanceOptions.valueMin);
        } else if (type === 'max') {
            this.domService.addClass(slider, 'eksi-slider-max');
            slider.value = String(this.instanceOptions.valueMax);
        } else {
            slider.value = String(this.instanceOptions.value);
        }
        return slider;
    }

    protected setupListeners(): void {
      // Event listeners are added in setupUI after elements are created.
      // This method could be used if there were global listeners for the component.
    }

    private addEventListeners(): void {
        if (!this.sliderElement) return;
        this.domService.addEventListener(this.sliderElement, 'input', () => this.handleSliderInput());
        this.domService.addEventListener(this.sliderElement, 'change', () => this.handleSliderChange());

        if (this.instanceOptions.dualValue && this.secondSliderElement) {
            this.domService.addEventListener(this.secondSliderElement, 'input', () => this.handleSliderInput());
            this.domService.addEventListener(this.secondSliderElement, 'change', () => this.handleSliderChange());
        }
    }

    protected registerObservers(): void {
        // No observers typically needed for a slider component itself.
    }

    protected cleanup(): void {
        if (this.containerElement && this.containerElement.parentElement) {
            this.containerElement.parentElement.removeChild(this.containerElement);
        }
        this.containerElement = null;
        this.sliderElement = null;
        this.secondSliderElement = null;
        this.valueLabelElement = null;
        this.trackElement = null;
        this.progressElement = null;
        // Remove specific event listeners if they were global; here they are on contained elements so removed with them.
    }

    // --- Public API specific to SliderFilterComponent ---
    public getElement(): HTMLElement | null {
        return this.containerElement;
    }

    private handleSliderInput(): void {
        this.updateSliderProgress();
        this.updateValueLabel();
        this.debouncedOnChange();
    }

    private handleSliderChange(): void {
        this.updateSliderProgress();
        this.updateValueLabel();
        this.triggerOnChange();
    }

    private debouncedOnChange = (() => {
        let timeout: number | null = null;
        return () => {
            if (timeout !== null) window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                this.triggerOnChange();
                timeout = null;
            }, 50);
        };
    })();

    private triggerOnChange(): void {
        if (!this.instanceOptions.onChange) return;
        if (this.instanceOptions.dualValue && this.sliderElement && this.secondSliderElement) {
            const minValue = parseFloat(this.sliderElement.value);
            const maxValue = parseFloat(this.secondSliderElement.value);
            this.instanceOptions.onChange([minValue, maxValue]);
        } else if (this.sliderElement) {
            const value = parseFloat(this.sliderElement.value);
            this.instanceOptions.onChange(value);
        }
    }

    private updateSliderProgress(): void {
        if (!this.progressElement || !this.sliderElement || !this.trackElement) return;

        const min = this.instanceOptions.min;
        const max = this.instanceOptions.max;
        const range = max - min;
        if (range === 0) return; // Avoid division by zero

        if (this.instanceOptions.dualValue && this.secondSliderElement) {
            let minValue = parseFloat(this.sliderElement.value);
            let maxValue = parseFloat(this.secondSliderElement.value);

            if (minValue > maxValue) {
                if (this.sliderElement === document.activeElement) {
                    this.secondSliderElement.value = String(minValue);
                    maxValue = minValue;
                } else {
                    this.sliderElement.value = String(maxValue);
                    minValue = maxValue;
                }
            }
            const minPercent = ((minValue - min) / range) * 100;
            const maxPercent = ((maxValue - min) / range) * 100;
            if (this.instanceOptions.orientation === 'horizontal') {
                this.progressElement.style.left = `${minPercent}%`;
                this.progressElement.style.width = `${maxPercent - minPercent}%`;
            } else {
                this.progressElement.style.bottom = `${minPercent}%`;
                this.progressElement.style.height = `${maxPercent - minPercent}%`;
            }
        } else {
            const percent = ((parseFloat(this.sliderElement.value) - min) / range) * 100;
            if (this.instanceOptions.orientation === 'horizontal') {
                this.progressElement.style.width = `${percent}%`;
                this.progressElement.style.left = '0%'; // Ensure it starts from left for single
            } else {
                this.progressElement.style.height = `${percent}%`;
                this.progressElement.style.bottom = '0%'; // Ensure it starts from bottom for single
            }
        }
    }

    private updateValueLabel(): void {
        if (!this.valueLabelElement || !this.sliderElement || !this.instanceOptions.showValueLabel) return;

        if (this.instanceOptions.dualValue && this.secondSliderElement) {
            const minValue = parseFloat(this.sliderElement.value);
            const maxValue = parseFloat(this.secondSliderElement.value);
            this.valueLabelElement.textContent = 
                `${this.instanceOptions.valueLabelFormat(minValue)} - ${this.instanceOptions.valueLabelFormat(maxValue)}`;
        } else {
            const value = parseFloat(this.sliderElement.value);
            this.valueLabelElement.textContent = this.instanceOptions.valueLabelFormat(value);
        }
    }

    public getValue(): number | [number, number] {
        if (this.instanceOptions.dualValue && this.sliderElement && this.secondSliderElement) {
            return [parseFloat(this.sliderElement.value), parseFloat(this.secondSliderElement.value)];
        } else if (this.sliderElement) {
            return parseFloat(this.sliderElement.value);
        }
        return this.instanceOptions.dualValue ? 
               [this.instanceOptions.valueMin, this.instanceOptions.valueMax] : 
               this.instanceOptions.value;
    }

    public setValue(value: number | [number, number]): void {
        if (Array.isArray(value) && this.instanceOptions.dualValue && this.sliderElement && this.secondSliderElement) {
            this.sliderElement.value = String(value[0]);
            this.secondSliderElement.value = String(value[1]);
        } else if (!Array.isArray(value) && !this.instanceOptions.dualValue && this.sliderElement) {
            this.sliderElement.value = String(value);
        }
        this.updateSliderProgress();
        this.updateValueLabel();
        this.triggerOnChange(); // Optionally trigger change or not, depending on desired behavior for programmatic set
    }

    public setDisabled(disabled: boolean): void {
        if (!this.containerElement) return;
        this.instanceOptions.disabled = disabled;
        if (disabled) {
            this.domService.addClass(this.containerElement, 'eksi-slider-disabled');
        } else {
            this.domService.removeClass(this.containerElement, 'eksi-slider-disabled');
        }
        if (this.sliderElement) this.sliderElement.disabled = disabled;
        if (this.secondSliderElement) this.secondSliderElement.disabled = disabled;
    }

    public setRange(min: number, max: number): void {
        if (!this.sliderElement) return;
        this.instanceOptions.min = min;
        this.instanceOptions.max = max;
        this.sliderElement.min = String(min);
        this.sliderElement.max = String(max);
        if (this.secondSliderElement) {
            this.secondSliderElement.min = String(min);
            this.secondSliderElement.max = String(max);
        }
        this.updateSliderProgress();
        this.updateValueLabel();
    }

    public setStep(step: number): void {
        if (!this.sliderElement) return;
        this.instanceOptions.step = step;
        this.sliderElement.step = String(step);
        if (this.secondSliderElement) {
            this.secondSliderElement.step = String(step);
        }
    }

    public setValueLabelFormat(format: (value: number) => string): void {
        this.instanceOptions.valueLabelFormat = format;
        this.updateValueLabel();
    }
}