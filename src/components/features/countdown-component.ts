/**
 * CountdownComponent
 * A standalone component for displaying and managing countdown timers
 */
import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { DOMService } from '../../services/dom-service';
import { CSSService } from '../../services/css-service';
import { LoggingService } from "../../services/logging-service";
import { IconComponent } from "../shared/icon-component";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { CountdownOptions, ICountdownComponent } from "../../interfaces/components/ICountdownComponent";
import { IconProps, IIconComponent } from "../../interfaces/components/IIconComponent";
import { IObserverService } from '../../interfaces/services/IObserverService';

export class CountdownComponent extends BaseFeatureComponent implements ICountdownComponent {
    private countdownInstanceElement: HTMLElement | null = null;
    private timeElement: HTMLElement | null = null;
    private intervalId: number | null = null;
    private remainingSeconds: number = 0;
    private instanceOptions: Required<CountdownOptions>;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        options: CountdownOptions = {},
        baseOptions?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, baseOptions);
        
        const defaultIconProps: IconProps = {
            name: 'schedule',
            size: 'small',
            color: '#81c14b'
        };

        this.instanceOptions = {
            initialSeconds: 0,
            autoStart: true,
            showIcon: true,
            icon: defaultIconProps,
            showLabel: true,
            label: 'Sonraki işlem için bekleniyor:',
            textFormat: (sec) => this.formatTime(sec),
            onTick: () => {},
            onComplete: () => {},
            className: '',
            ...options
        };
        this.remainingSeconds = Math.max(0, this.instanceOptions.initialSeconds);
    }

    protected getStyles(): string | null {
        return `
            .eksi-countdown-container {
                display: flex;
                align-items: center;
                background-color: rgba(129, 193, 75, 0.1);
                border-radius: 4px;
                padding: 8px 12px;
                margin: 8px 0;
                font-size: 13px;
                line-height: 1.4;
            }
            .eksi-countdown-icon { color: #81c14b; font-size: 16px; margin-right: 8px; }
            .eksi-countdown-label { margin-right: 6px; color: rgba(0,0,0,0.7); }
            .eksi-countdown-time { color: #000; }
            .eksi-countdown-time strong { font-weight: 600; }
            @media (prefers-color-scheme: dark) {
                .eksi-countdown-container { background-color: rgba(129, 193, 75, 0.2); }
                .eksi-countdown-label { color: rgba(255, 255, 255, 0.8); }
                .eksi-countdown-time { color: #fff; }
            }
        `;
    }

    protected shouldInitialize(): boolean { return true; }

    protected setupUI(): void {
        try {
            if (this.countdownInstanceElement && this.countdownInstanceElement.parentElement) {
                this.countdownInstanceElement.parentElement.removeChild(this.countdownInstanceElement);
            }
            this.countdownInstanceElement = this.domHandler.createElement('div');
            this.domHandler.addClass(this.countdownInstanceElement, 'eksi-countdown-container');

            if (this.instanceOptions.className) {
                this.domHandler.addClass(this.countdownInstanceElement, this.instanceOptions.className);
            }

            let contentHTML = '';
            if (this.instanceOptions.showIcon && this.instanceOptions.icon) {
                const iconElement = this.iconComponent.create({
                    ...this.instanceOptions.icon,
                    className: 'eksi-countdown-icon'
                });
                contentHTML += iconElement.outerHTML;
            }
            if (this.instanceOptions.showLabel && this.instanceOptions.label) {
                contentHTML += `<span class="eksi-countdown-label">${this.instanceOptions.label}</span>`;
            }
            contentHTML += `<span class="eksi-countdown-time"><strong>${this.instanceOptions.textFormat(this.remainingSeconds)}</strong></span>`;
            this.countdownInstanceElement.innerHTML = contentHTML;

            this.timeElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-time', this.countdownInstanceElement);

            if (this.instanceOptions.autoStart) {
                this.start();
            }
        } catch (error) {
            this.loggingService.error('Error creating countdown UI:', error);
            if (!this.countdownInstanceElement) {
                this.countdownInstanceElement = this.domHandler.createElement('div');
            }
            this.countdownInstanceElement.textContent = `Countdown Error: ${this.remainingSeconds}s`;
        }
    }
    
    protected setupListeners(): void {}
    protected registerObservers(): void {}

    protected cleanup(): void {
        this.stop();
        if (this.countdownInstanceElement && this.countdownInstanceElement.parentElement) {
            this.countdownInstanceElement.parentElement.removeChild(this.countdownInstanceElement);
        }
        this.countdownInstanceElement = null;
        this.timeElement = null;
    }

    public getElement(): HTMLElement | null {
        return this.countdownInstanceElement;
    }

    public start(): void {
        if (this.intervalId !== null) this.stop();
        this.updateDisplay();
        this.intervalId = window.setInterval(() => {
            this.remainingSeconds--;
            if (this.instanceOptions.onTick) this.instanceOptions.onTick(this.remainingSeconds);
            this.updateDisplay();
            if (this.remainingSeconds <= 0) {
                this.stop();
                if (this.instanceOptions.onComplete) this.instanceOptions.onComplete();
            }
        }, 1000);
    }

    public stop(): void {
        if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public reset(seconds?: number): void {
        this.stop();
        this.remainingSeconds = Math.max(0, seconds !== undefined ? seconds : this.instanceOptions.initialSeconds);
        this.updateDisplay();
    }

    private updateDisplay(): void {
        if (!this.timeElement) return;
        this.timeElement.innerHTML = `<strong>${this.instanceOptions.textFormat(this.remainingSeconds)}</strong>`;
    }

    private formatTime(seconds: number): string {
        if (seconds <= 0) return 'Tamamlandı';
        return `${seconds} saniye`;
    }

    public getRemainingSeconds(): number {
        return this.remainingSeconds;
    }

    public setLabel(label: string): void {
        if (!this.countdownInstanceElement) return;
        const labelElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-label', this.countdownInstanceElement);
        if (labelElement) {
            labelElement.textContent = label;
        } else if (this.instanceOptions.showLabel) {
            const newLabelElement = this.domHandler.createElement('span');
            this.domHandler.addClass(newLabelElement, 'eksi-countdown-label');
            newLabelElement.textContent = label;
            const iconEl = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownInstanceElement);
            if (iconEl && iconEl.nextSibling) this.countdownInstanceElement.insertBefore(newLabelElement, iconEl.nextSibling);
            else this.countdownInstanceElement.insertBefore(newLabelElement, this.countdownInstanceElement.firstChild);
        }
        this.instanceOptions.label = label;
    }

    public setIcon(iconProps: IconProps): void {
        if (!this.countdownInstanceElement) return;
        let iconElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownInstanceElement);
        const newIconElement = this.iconComponent.create({ ...iconProps, className: 'eksi-countdown-icon' });
        if (iconElement) {
            iconElement.parentNode?.replaceChild(newIconElement, iconElement);
        } else if (this.instanceOptions.showIcon) {
            this.countdownInstanceElement.insertBefore(newIconElement, this.countdownInstanceElement.firstChild);
        }
        this.instanceOptions.icon = iconProps;
    }

    public toggleIcon(show: boolean): void {
        if (!this.countdownInstanceElement) return;
        const iconElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-icon', this.countdownInstanceElement);
        if (show && !iconElement && this.instanceOptions.icon) this.setIcon(this.instanceOptions.icon);
        else if (!show && iconElement) iconElement.remove();
        this.instanceOptions.showIcon = show;
    }

    public toggleLabel(show: boolean): void {
        if (!this.countdownInstanceElement) return;
        const labelElement = this.domHandler.querySelector<HTMLElement>('.eksi-countdown-label', this.countdownInstanceElement);
        if (show && !labelElement && this.instanceOptions.label) this.setLabel(this.instanceOptions.label);
        else if (!show && labelElement) labelElement.remove();
        this.instanceOptions.showLabel = show;
    }

    public setTextFormat(formatFn: (seconds: number) => string): void {
        this.instanceOptions.textFormat = formatFn;
        this.updateDisplay();
    }

    public create(seconds: number, options?: CountdownOptions): HTMLElement {
        this.loggingService.debug(`CountdownComponent.create called with seconds: ${seconds}`);
        this.stop();

        const defaultIconProps: IconProps = this.instanceOptions.icon || { name: 'schedule', size: 'small', color: '#81c14b' };
        this.instanceOptions = {
            initialSeconds: seconds,
            autoStart: options?.autoStart !== undefined ? options.autoStart : this.instanceOptions.autoStart,
            showIcon: options?.showIcon !== undefined ? options.showIcon : this.instanceOptions.showIcon,
            icon: options?.icon !== undefined ? options.icon : defaultIconProps,
            showLabel: options?.showLabel !== undefined ? options.showLabel : this.instanceOptions.showLabel,
            label: options?.label !== undefined ? options.label : this.instanceOptions.label,
            textFormat: options?.textFormat !== undefined ? options.textFormat : this.instanceOptions.textFormat,
            onTick: options?.onTick !== undefined ? options.onTick : this.instanceOptions.onTick,
            onComplete: options?.onComplete !== undefined ? options.onComplete : this.instanceOptions.onComplete,
            className: options?.className !== undefined ? options.className : this.instanceOptions.className,
            ...(options || {})
        };
        this.remainingSeconds = Math.max(0, this.instanceOptions.initialSeconds);

        if (this.countdownInstanceElement && this.countdownInstanceElement.parentElement) {
            this.countdownInstanceElement.parentElement.removeChild(this.countdownInstanceElement);
            this.countdownInstanceElement = null;
        }
        this.setupUI();
        
        if (!this.countdownInstanceElement) {
            this.loggingService.error('Countdown element not created after setupUI in create');
            this.countdownInstanceElement = this.domHandler.createElement('div');
            this.countdownInstanceElement.textContent = "Error creating countdown";
        }
        return this.countdownInstanceElement as HTMLElement;
    }
}