import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IProgressWidgetComponent, ProgressWidgetOptions, ProgressWidgetData } from "../../interfaces/components/IProgressWidgetComponent";

export class ProgressWidgetComponent implements IProgressWidgetComponent {
    private widgetElement: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private progressText: HTMLElement | null = null;
    private messageElement: HTMLElement | null = null;
    private countdownElement: HTMLElement | null = null;
    private stopButton: HTMLElement | null = null;
    private closeButton: HTMLElement | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private countdownInterval: number | null = null;

    constructor(
        private domService: IDOMService,
        private cssService: ICSSService,
        private loggingService: ILoggingService
    ) {
        this.initStyles();
    }

    private initStyles(): void {
        const css = `
            .eksi-progress-widget {
                position: fixed;
                z-index: 10000;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                padding: 12px;
                min-width: 280px;
                max-width: 320px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                user-select: none;
            }

            .eksi-progress-widget.dragging {
                transform: scale(1.02);
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
                cursor: grabbing;
            }

            .eksi-progress-widget.draggable {
                cursor: grab;
            }

            .eksi-progress-widget-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid #f0f0f0;
            }

            .eksi-progress-widget-title {
                font-weight: 600;
                color: #333;
                font-size: 12px;
                flex: 1;
            }

            .eksi-progress-widget-controls {
                display: flex;
                gap: 4px;
            }

            .eksi-progress-widget-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 11px;
                color: #666;
                transition: all 0.15s ease;
                line-height: 1;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .eksi-progress-widget-btn:hover {
                background: #f5f5f5;
                color: #333;
            }

            .eksi-progress-widget-btn.stop {
                color: #ff6b6b;
            }

            .eksi-progress-widget-btn.stop:hover {
                background: #ffe0e0;
                color: #e53e3e;
            }

            .eksi-progress-widget-btn.close {
                color: #999;
            }

            .eksi-progress-widget-btn.close:hover {
                background: #f0f0f0;
                color: #666;
            }

            .eksi-progress-widget-content {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .eksi-progress-widget-text {
                font-weight: 500;
                color: #555;
                font-size: 12px;
            }

            .eksi-progress-widget-message {
                color: #777;
                font-size: 11px;
                line-height: 1.3;
            }

            .eksi-progress-widget-bar-container {
                background: #f0f0f0;
                border-radius: 6px;
                height: 6px;
                overflow: hidden;
                position: relative;
            }

            .eksi-progress-widget-bar {
                background: linear-gradient(90deg, #81c14b, #6ea542);
                height: 100%;
                border-radius: 6px;
                transition: width 0.3s ease;
                position: relative;
            }

            .eksi-progress-widget-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: eksi-progress-shimmer 1.5s infinite;
            }

            @keyframes eksi-progress-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .eksi-progress-widget-countdown {
                color: #999;
                font-size: 10px;
                text-align: center;
                margin-top: 2px;
                min-height: 14px; /* Reserve space to prevent jumping */
                line-height: 14px;
            }

            /* Position classes */
            .eksi-progress-widget.position-top-right {
                top: 20px;
                right: 20px;
            }

            .eksi-progress-widget.position-top-left {
                top: 20px;
                left: 20px;
            }

            .eksi-progress-widget.position-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .eksi-progress-widget.position-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-progress-widget {
                    background: rgba(45, 45, 45, 0.95);
                    border-color: #555;
                    color: #e0e0e0;
                }

                .eksi-progress-widget-title {
                    color: #f0f0f0;
                }

                .eksi-progress-widget-text {
                    color: #d0d0d0;
                }

                .eksi-progress-widget-message {
                    color: #b0b0b0;
                }

                .eksi-progress-widget-bar-container {
                    background: #333;
                }

                .eksi-progress-widget-btn:hover {
                    background: #555;
                    color: #f0f0f0;
                }
            }

            /* Animation for showing/hiding */
            .eksi-progress-widget.showing {
                animation: eksi-widget-slide-in 0.3s ease-out;
            }

            .eksi-progress-widget.hiding {
                animation: eksi-widget-slide-out 0.3s ease-in;
            }

            @keyframes eksi-widget-slide-in {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes eksi-widget-slide-out {
                from {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.9);
                }
            }
        `;
        this.cssService.addCSS(css);
    }

    public show(options: ProgressWidgetOptions = {}): void {
        if (this.widgetElement) {
            this.hide();
        }

        this.createElement(options);
        this.appendToDOM();
        this.setupEventListeners(options);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            if (this.widgetElement) {
                this.domService.addClass(this.widgetElement, 'showing');
            }
        });
    }

    public updateProgress(data: ProgressWidgetData): void {
        if (!this.widgetElement) return;

        const percentage = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;

        if (this.progressText) {
            this.progressText.textContent = `${data.current} / ${data.total} (${percentage}%)`;
        }

        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
            
            // Change progress bar color based on message content
            if (data.message?.includes('✅') || data.message?.includes('tamamlandı')) {
                // Success - green
                this.progressBar.style.background = 'linear-gradient(90deg, #81c14b, #6ea542)';
            } else if (data.message?.includes('❌') || data.message?.includes('Hata')) {
                // Error - red
                this.progressBar.style.background = 'linear-gradient(90deg, #e53935, #c62828)';
            } else {
                // Default - green
                this.progressBar.style.background = 'linear-gradient(90deg, #81c14b, #6ea542)';
            }
        }

        if (this.messageElement && data.message) {
            this.messageElement.textContent = data.message;
        }

        if (data.countdownSeconds !== undefined) {
            this.startCountdown(data.countdownSeconds);
        }
    }

    public updateMessage(message: string): void {
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    public hide(): void {
        if (!this.widgetElement) return;

        this.domService.addClass(this.widgetElement, 'hiding');
        
        setTimeout(() => {
            if (this.widgetElement && this.widgetElement.parentNode) {
                this.widgetElement.parentNode.removeChild(this.widgetElement);
            }
            this.cleanup();
        }, 300);
    }

    private createElement(options: ProgressWidgetOptions): void {
        this.widgetElement = this.domService.createElement('div');
        this.domService.addClass(this.widgetElement, 'eksi-progress-widget');
        this.domService.addClass(this.widgetElement, `position-${options.position || 'bottom-right'}`);

        if (options.draggable !== false) {
            this.domService.addClass(this.widgetElement, 'draggable');
        }

        // Header
        const header = this.domService.createElement('div');
        this.domService.addClass(header, 'eksi-progress-widget-header');

        const title = this.domService.createElement('div');
        this.domService.addClass(title, 'eksi-progress-widget-title');
        title.textContent = options.title || 'İşlem Devam Ediyor';

        const controls = this.domService.createElement('div');
        this.domService.addClass(controls, 'eksi-progress-widget-controls');

        if (options.onStop) {
            this.stopButton = this.domService.createElement('button');
            this.domService.addClass(this.stopButton, 'eksi-progress-widget-btn');
            this.domService.addClass(this.stopButton, 'stop');
            this.stopButton.innerHTML = '⏹';
            this.stopButton.title = 'Durdur';
            this.domService.appendChild(controls, this.stopButton);
        }

        if (options.closable !== false) {
            this.closeButton = this.domService.createElement('button');
            this.domService.addClass(this.closeButton, 'eksi-progress-widget-btn');
            this.domService.addClass(this.closeButton, 'close');
            this.closeButton.innerHTML = '×';
            this.closeButton.title = 'Kapat';
            this.domService.appendChild(controls, this.closeButton);
        }

        this.domService.appendChild(header, title);
        this.domService.appendChild(header, controls);

        // Content
        const content = this.domService.createElement('div');
        this.domService.addClass(content, 'eksi-progress-widget-content');

        this.progressText = this.domService.createElement('div');
        this.domService.addClass(this.progressText, 'eksi-progress-widget-text');
        this.progressText.textContent = '0 / 0 (0%)';

        this.messageElement = this.domService.createElement('div');
        this.domService.addClass(this.messageElement, 'eksi-progress-widget-message');

        const progressContainer = this.domService.createElement('div');
        this.domService.addClass(progressContainer, 'eksi-progress-widget-bar-container');

        this.progressBar = this.domService.createElement('div');
        this.domService.addClass(this.progressBar, 'eksi-progress-widget-bar');
        this.progressBar.style.width = '0%';

        this.countdownElement = this.domService.createElement('div');
        this.domService.addClass(this.countdownElement, 'eksi-progress-widget-countdown');

        this.domService.appendChild(progressContainer, this.progressBar);
        this.domService.appendChild(content, this.progressText);
        this.domService.appendChild(content, this.messageElement);
        this.domService.appendChild(content, progressContainer);
        this.domService.appendChild(content, this.countdownElement);

        this.domService.appendChild(this.widgetElement, header);
        this.domService.appendChild(this.widgetElement, content);
    }

    private appendToDOM(): void {
        if (this.widgetElement) {
            this.domService.appendChild(document.body, this.widgetElement);
        }
    }

    private setupEventListeners(options: ProgressWidgetOptions): void {
        if (!this.widgetElement) return;

        // Stop button
        if (this.stopButton && options.onStop) {
            this.domService.addEventListener(this.stopButton, 'click', (e) => {
                e.stopPropagation();
                options.onStop?.();
            });
        }

        // Close button
        if (this.closeButton) {
            this.domService.addEventListener(this.closeButton, 'click', (e) => {
                e.stopPropagation();
                options.onClose?.();
                this.hide();
            });
        }

        // Dragging functionality
        if (options.draggable !== false) {
            this.setupDragging();
        }
    }

    private setupDragging(): void {
        if (!this.widgetElement) return;

        this.domService.addEventListener(this.widgetElement, 'mousedown', (e) => {
            if ((e.target as HTMLElement).closest('.eksi-progress-widget-btn')) {
                return; // Don't drag when clicking buttons
            }

            this.isDragging = true;
            this.domService.addClass(this.widgetElement!, 'dragging');

            const rect = this.widgetElement!.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !this.widgetElement) return;

            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // Keep widget within viewport bounds
            const maxX = window.innerWidth - this.widgetElement.offsetWidth;
            const maxY = window.innerHeight - this.widgetElement.offsetHeight;

            this.widgetElement.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.widgetElement.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            this.widgetElement.style.right = 'auto';
            this.widgetElement.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging && this.widgetElement) {
                this.isDragging = false;
                this.domService.removeClass(this.widgetElement, 'dragging');
            }
        });
    }

    private startCountdown(seconds: number): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        let remaining = seconds;
        
        const updateCountdown = () => {
            if (this.countdownElement) {
                if (remaining > 0) {
                    this.countdownElement.textContent = `Sonraki: ${remaining}s`;
                    remaining--;
                } else {
                    this.countdownElement.textContent = '';
                    if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                    }
                }
            }
        };

        updateCountdown();
        this.countdownInterval = window.setInterval(updateCountdown, 1000);
    }

    private cleanup(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        this.widgetElement = null;
        this.progressBar = null;
        this.progressText = null;
        this.messageElement = null;
        this.countdownElement = null;
        this.stopButton = null;
        this.closeButton = null;
    }
} 