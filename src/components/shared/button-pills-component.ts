import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IconComponent } from '../shared/icon-component';
import { debounce } from '../../services/shared/utilities';

// Define types directly in the file to avoid import issues
export interface PillOption {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    defaultDirection?: 'asc' | 'desc';
    ariaLabel?: string;
}

export interface ButtonPillsProps {
    options: PillOption[];
    onPillClick: (data: PillClickData) => void;
    activeOption?: string;
    direction?: 'asc' | 'desc';
    showDirectionOnActive?: boolean;
    allowDirectionToggle?: boolean;
    className?: string;
}

export interface PillClickData {
    option: PillOption;
    direction: 'asc' | 'desc';
    wasActive: boolean;
}

export interface IButtonPillsComponent {
    create(props: ButtonPillsProps): HTMLElement;
    setActiveOption(value: string, direction?: 'asc' | 'desc'): void;
    getActiveOption(): string | null;
    getCurrentDirection(): 'asc' | 'desc';
    setDirection(direction: 'asc' | 'desc'): void;
    updateOptions(options: PillOption[]): void;
    setDisabled(value: string, disabled: boolean): void;
    destroy(): void;
}

export class ButtonPillsComponent implements IButtonPillsComponent {
    private container: HTMLElement | null = null;
    private pills: HTMLElement[] = [];
    private activePill: string | null = null;
    private currentDirection: 'asc' | 'desc' = 'desc';
    private props: ButtonPillsProps;
    private static stylesApplied = false;
    private isProcessing = false;
    private processingPill: string | null = null; // Track which specific pill is processing
    
    // Debounced click handler to prevent rapid clicking
    private debouncedClickHandler: (option: PillOption) => void;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IIconComponent
    ) {
        this.props = {
            options: [],
            onPillClick: () => {},
            direction: 'desc',
            showDirectionOnActive: true
        };
        
        // Initialize debounced click handler (300ms debounce to prevent rapid clicking)
        this.debouncedClickHandler = debounce((option: PillOption) => {
            this.executeClick(option);
        }, 300);
        
        this.applyStyles();
    }

    public create(props: ButtonPillsProps): HTMLElement {
        try {
            this.props = { ...this.props, ...props };
            this.currentDirection = props.direction || 'desc';
            this.activePill = props.activeOption || null;

            // Create container
            this.container = this.domService.createElement('div');
            this.domService.addClass(this.container, 'eksi-button-pills-container');

            if (props.className) {
                this.domService.addClass(this.container, props.className);
            }

            // Create pills
            this.renderPills();

            return this.container;
        } catch (error) {
            this.loggingService.error('Error creating button pills:', error);
            return this.domService.createElement('div');
        }
    }

    private renderPills(): void {
        if (!this.container) return;

        // Clear existing pills
        this.container.innerHTML = '';
        this.pills = [];

        this.props.options.forEach(option => {
            const pill = this.createPill(option);
            this.pills.push(pill);
            this.domService.appendChild(this.container!, pill);
        });
    }

    private createPill(option: PillOption): HTMLElement {
        const isActive = this.activePill === option.value;
        
        const pill = this.domService.createElement('button');
        this.domService.addClass(pill, 'eksi-pill');
        
        if (isActive) {
            this.domService.addClass(pill, 'active');
        }

        if (option.disabled) {
            this.domService.addClass(pill, 'disabled');
            pill.setAttribute('disabled', 'true');
        }

        pill.setAttribute('type', 'button');
        pill.setAttribute('data-value', option.value);
        pill.setAttribute('aria-label', option.ariaLabel || option.label);

        // Create pill content
        const content = this.domService.createElement('span');
        this.domService.addClass(content, 'eksi-pill-content');

        // Add icon if available
        if (option.icon) {
            const icon = this.iconComponent.create({
                name: option.icon,
                size: 'small',
                className: 'eksi-pill-icon'
            });
            this.domService.appendChild(content, icon);
        }

        // Add label
        const labelSpan = this.domService.createElement('span');
        this.domService.addClass(labelSpan, 'eksi-pill-label');
        labelSpan.textContent = option.label;
        this.domService.appendChild(content, labelSpan);

        // Add direction indicator for active pill if enabled
        if (isActive && this.props.showDirectionOnActive) {
            try {
                const direction = this.currentDirection || 'desc';
                const directionIcon = this.iconComponent.create({
                    name: 'arrow_upward', // Always use upward arrow, we'll rotate it with CSS
                    size: 'small',
                    className: 'eksi-pill-direction'
                });
                
                // Add direction class after creation
                this.domService.addClass(directionIcon, direction);
                this.domService.appendChild(content, directionIcon);
            } catch (error) {
                this.loggingService.error('Error creating direction icon in createPill:', error);
            }
        }

        this.domService.appendChild(pill, content);

        // Add click handler
        pill.addEventListener('click', () => this.handlePillClick(option));

        return pill;
    }

    private handlePillClick(option: PillOption): void {
        if (option.disabled || this.isProcessing) return;

        // Use debounced handler to prevent rapid clicks
        this.debouncedClickHandler(option);
    }

    private executeClick(option: PillOption): void {
        if (option.disabled || this.isProcessing) return;

        // Set processing flag to prevent additional clicks until processing is complete
        this.isProcessing = true;
        this.processingPill = option.value; // Track which specific pill is processing
        
        // Update visual state to show processing
        this.updatePillsState();

        try {
            const wasActive = this.activePill === option.value;
            
            if (wasActive && this.props.allowDirectionToggle !== false) {
                // Toggle direction if clicking the active pill
                this.currentDirection = this.currentDirection === 'desc' ? 'asc' : 'desc';
            } else {
                // Switch to new pill
                this.activePill = option.value;
                // Use option's default direction or keep current
                if (option.defaultDirection && !wasActive) {
                    this.currentDirection = option.defaultDirection;
                }
            }

            // Update visual state
            this.updatePillsState();

            // Call callback with updated state
            this.props.onPillClick({
                option,
                direction: this.currentDirection,
                wasActive
            });
        } catch (error) {
            this.loggingService.error('Error in executeClick:', error);
        } finally {
            // Reset processing flag after a short delay to allow for any async operations
            setTimeout(() => {
                this.isProcessing = false;
                this.processingPill = null; // Clear processing pill
                this.updatePillsState(); // Update visual state to remove processing indicators
            }, 100);
        }
    }

    private updatePillsState(): void {
        this.pills.forEach(pill => {
            const value = pill.getAttribute('data-value');
            const isActive = this.activePill === value;
            
            // Update active state
            if (isActive) {
                this.domService.addClass(pill, 'active');
            } else {
                this.domService.removeClass(pill, 'active');
            }

            // Update processing state - only show processing on the clicked pill
            if (this.isProcessing && this.processingPill === value) {
                this.domService.addClass(pill, 'processing');
            } else {
                this.domService.removeClass(pill, 'processing');
            }

            // Update content to add/remove direction indicator
            const content = pill.querySelector('.eksi-pill-content');
            if (content) {
                const existingDirection = content.querySelector('.eksi-pill-direction');
                
                if (isActive && this.props.showDirectionOnActive) {
                    if (existingDirection) {
                        // Update existing direction icon with smooth transition
                        this.domService.removeClass(existingDirection, 'asc');
                        this.domService.removeClass(existingDirection, 'desc');
                        this.domService.addClass(existingDirection, this.currentDirection);
                    } else {
                        try {
                            // Create new direction icon
                            const direction = this.currentDirection || 'desc';
                            const directionIcon = this.iconComponent.create({
                                name: 'arrow_upward', // Always use upward arrow, we'll rotate it with CSS
                                size: 'small',
                                className: 'eksi-pill-direction'
                            });
                            
                            // Add direction class after creation
                            this.domService.addClass(directionIcon, direction);
                            this.domService.appendChild(content, directionIcon);
                        } catch (error) {
                            this.loggingService.error('Error creating direction icon:', error);
                        }
                    }
                } else if (existingDirection) {
                    // Remove direction icon if not active
                    content.removeChild(existingDirection);
                }
            }
        });
    }

    private applyStyles(): void {
        if (ButtonPillsComponent.stylesApplied) return;

        const styles = `
            /* Button pills container */
            .eksi-button-pills-container {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
            }
            
            /* Individual pill button */
            .eksi-pill {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border: 1px solid rgba(0, 0, 0, 0.15);
                border-radius: 20px;
                background-color: rgba(0, 0, 0, 0.03);
                color: #333;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                outline: none;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            .eksi-pill:hover:not(.disabled):not(.processing) {
                background-color: rgba(0, 0, 0, 0.08);
                border-color: rgba(0, 0, 0, 0.25);
                transform: translateY(-1px);
            }
            
            .eksi-pill:active:not(.disabled):not(.processing) {
                transform: translateY(0);
            }
            
            .eksi-pill:focus-visible {
                box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.5);
            }
            
            /* Active pill styling */
            .eksi-pill.active {
                background-color: #4a90e2;
                border-color: #357abd;
                color: white;
                box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);
            }
            
            .eksi-pill.active:hover {
                background-color: #357abd;
                border-color: #2968a3;
                transform: translateY(-1px);
            }
            
            /* Disabled pill styling */
            .eksi-pill.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: rgba(0, 0, 0, 0.02);
                border-color: rgba(0, 0, 0, 0.1);
            }
            
            /* Processing pill styling */
            .eksi-pill.processing {
                opacity: 0.7;
                cursor: wait;
                pointer-events: none;
                position: relative;
            }
            
            .eksi-pill.processing::after {
                content: '';
                position: absolute;
                top: 50%;
                right: 11px;
                width: 12px;
                height: 12px;
                margin-top: -8px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: pill-spin 0.8s linear infinite;
            }
            
            @keyframes pill-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Pill content */
            .eksi-pill-content {
                display: flex;
                align-items: center;
                gap: 4px;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
            
            .eksi-pill-icon {
                display: flex;
                align-items: center;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
            
            .eksi-pill-label {
                line-height: 1;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
            
            .eksi-pill-direction {
                display: flex;
                align-items: center;
                margin-left: 2px;
                opacity: 0.9;
                transition: transform 0.3s ease-in-out;
                transform-origin: center;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
            
            .eksi-pill-direction.asc {
                transform: rotate(0deg);
            }
            
            .eksi-pill-direction.desc {
                transform: rotate(180deg);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-pill {
                    background-color: rgba(255, 255, 255, 0.08) !important;
                    border-color: rgba(255, 255, 255, 0.2) !important;
                    color: #e0e0e0 !important;
                }
                
                .eksi-pill:hover:not(.disabled) {
                    background-color: rgba(255, 255, 255, 0.15) !important;
                    border-color: rgba(255, 255, 255, 0.3) !important;
                }
                
                .eksi-pill.active {
                    background-color: #4a90e2 !important;
                    border-color: #357abd !important;
                    color: white !important;
                }
                
                .eksi-pill.active:hover {
                    background-color: #357abd !important;
                    border-color: #2968a3 !important;
                }
                
                .eksi-pill.disabled {
                    background-color: rgba(255, 255, 255, 0.04) !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                }
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .eksi-button-pills-container {
                    gap: 6px;
                }
                
                .eksi-pill {
                    padding: 5px 10px;
                    font-size: 12px;
                }
            }
        `;

        this.cssService.addCSS(styles);
        ButtonPillsComponent.stylesApplied = true;
    }

    // Public API methods
    public setActiveOption(value: string, direction?: 'asc' | 'desc'): void {
        this.activePill = value;
        if (direction) {
            this.currentDirection = direction;
        }
        this.updatePillsState();
    }

    public getActiveOption(): string | null {
        return this.activePill;
    }

    public getCurrentDirection(): 'asc' | 'desc' {
        return this.currentDirection;
    }

    public setDirection(direction: 'asc' | 'desc'): void {
        this.currentDirection = direction;
        this.updatePillsState();
    }

    public updateOptions(options: PillOption[]): void {
        this.props.options = options;
        this.renderPills();
    }

    public setDisabled(value: string, disabled: boolean): void {
        const pill = this.pills.find(p => p.getAttribute('data-value') === value);
        if (pill) {
            if (disabled) {
                this.domService.addClass(pill, 'disabled');
                pill.setAttribute('disabled', 'true');
            } else {
                this.domService.removeClass(pill, 'disabled');
                pill.removeAttribute('disabled');
            }
        }
    }

    public destroy(): void {
        this.pills = [];
        this.container = null;
        this.activePill = null;
    }
} 