import {DOMService} from '../../services/dom-service';
import {CSSService} from '../../services/css-service';
import {ButtonComponent} from './button-component';
import {LoggingService} from "../../services/logging-service";
import {ICSSService} from "../../interfaces/services/ICSSService";
import {ILoggingService} from "../../interfaces/services/ILoggingService";
import {IDOMService} from "../../interfaces/services/IDOMService";
import {ButtonSize, ButtonVariant} from "../../interfaces/components/IButtonComponent";
import {IModalComponent, ModalOptions} from "../../interfaces/components/IModalComponent";

export class ModalComponent implements IModalComponent {
    protected modalElement: HTMLElement | null = null;
    private options: ModalOptions = {
        showCloseButton: true,
        allowBackdropClose: true,
        allowEscapeClose: true
    };

    constructor(
        protected domHandler: IDOMService,
        protected cssHandler: ICSSService,
        protected loggingService: ILoggingService,
        protected buttonComponent: ButtonComponent,
    ) {
        this.applyModalStyles();
    }

    /**
     * Show modal with optional configuration
     */
    show(options?: ModalOptions): void {
        try {
            if (options) {
                this.updateOptions(options);
            }
            this.createElement();
            this.appendModalToDOM();

            // Add keydown listener for Escape key to close modal (if enabled)
            if (this.options.allowEscapeClose !== false) {
                document.addEventListener('keydown', this.handleEscapeKey);
            }
        } catch (err) {
            this.loggingService.error('Error showing modal:', err);
        }
    }

    /**
     * Update modal options
     */
    updateOptions(options: ModalOptions): void {
        this.options = { ...this.options, ...options };
        
        // If modal is already created, update the close button visibility
        if (this.modalElement) {
            this.updateCloseButtonVisibility();
        }
    }

    /**
     * Handle Escape key press
     */
    private handleEscapeKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && this.modalElement && this.options.allowEscapeClose !== false) {
            this.close();
        }
    };

    /**
     * Create modal element with basic structure
     */
    protected createElement(): void {
        if (this.modalElement) return;

        // Create the modal container
        this.modalElement = this.domHandler.createElement('div');
        this.domHandler.addClass(this.modalElement, 'eksi-modal');

        // Create the modal content container
        const modalContent = this.domHandler.createElement('div');
        this.domHandler.addClass(modalContent, 'eksi-modal-content');

        // Add close button if enabled
        if (this.options.showCloseButton !== false) {
            const closeButton = this.createCloseButton();
            this.domHandler.appendChild(modalContent, closeButton);
        }

        // Add title if provided
        if (this.options.title) {
            const titleElement = this.domHandler.createElement('div');
            this.domHandler.addClass(titleElement, 'eksi-modal-title');
            titleElement.textContent = this.options.title;
            this.domHandler.appendChild(modalContent, titleElement);
        }

        this.domHandler.appendChild(this.modalElement, modalContent);

        // Add backdrop click to close (if enabled)
        if (this.options.allowBackdropClose !== false) {
            this.domHandler.addEventListener(this.modalElement, 'click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }
    }

    /**
     * Create close button element
     */
    private createCloseButton(): HTMLElement {
        const closeButton = this.domHandler.createElement('button');
        this.domHandler.addClass(closeButton, 'eksi-modal-close');
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close modal');
        closeButton.setAttribute('type', 'button');
        
        this.domHandler.addEventListener(closeButton, 'click', () => {
            this.close();
        });

        return closeButton;
    }

    /**
     * Update close button visibility
     */
    private updateCloseButtonVisibility(): void {
        if (!this.modalElement) return;

        const existingCloseButton = this.modalElement.querySelector('.eksi-modal-close');
        const modalContent = this.modalElement.querySelector('.eksi-modal-content');
        
        if (this.options.showCloseButton !== false && !existingCloseButton && modalContent) {
            // Add close button if it should be shown but doesn't exist
            const closeButton = this.createCloseButton();
            modalContent.insertBefore(closeButton, modalContent.firstChild);
        } else if (this.options.showCloseButton === false && existingCloseButton) {
            // Remove close button if it shouldn't be shown but exists
            existingCloseButton.remove();
        }
    }

    /**
     * Create an option button for the modal using the ButtonComponent
     */
    protected createOptionButton(text: string, variant: ButtonVariant = ButtonVariant.DEFAULT, clickHandler: () => void, icon?: string): HTMLButtonElement {
        return this.buttonComponent.create({
            text,
            variant,
            size: ButtonSize.MEDIUM,
            icon,
            iconPosition: 'left',
            onClick: clickHandler,
            className: 'eksi-modal-button'
        });
    }

    /**
     * Append modal to DOM
     */
    protected appendModalToDOM(): void {
        if (this.modalElement) {
            this.domHandler.appendChild(document.body, this.modalElement);
        }
    }

    /**
     * Close modal
     */
    close(): void {
        document.removeEventListener('keydown', this.handleEscapeKey);

        if (this.modalElement && this.modalElement.parentNode) {
            document.body.style.overflow = ''; // Restore scrolling
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    /**
     * Apply CSS styles for modal
     */
    private applyModalStyles(): void {
        const css = `
      /* Modal styling */
      .eksi-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100001;
        animation: eksiModalFadeIn 0.3s ease;
        backdrop-filter: blur(3px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      @keyframes eksiModalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .eksi-modal-content {
        background-color: #fff;
        padding: 24px;
        border-radius: 10px;
        max-width: 420px;
        width: 100%;
        color: #333;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
        animation: eksiModalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateY(0);
        position: relative;
      }

      @keyframes eksiModalSlideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }

      .eksi-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        font-weight: 300;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        line-height: 1;
        flex-shrink: 0;
      }

      .eksi-modal-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
        color: #666;
      }

      .eksi-modal-close:focus {
        outline: none;
        background-color: rgba(0, 0, 0, 0.1);
        color: #333;
      }

      .eksi-modal-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #222;
        border-bottom: 1px solid #eee;
        padding-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .eksi-modal-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }

      /* Preferences Modal Specific Styles */
      .eksi-modal-options label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .eksi-modal-options select,
      .eksi-modal-options textarea {
        width: 100%;
        padding: 8px;
        margin-bottom: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .eksi-modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }

      /* Resume Modal Specific Styles */
      .eksi-modal-message {
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .eksi-modal-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 15px 0;
        padding: 12px;
        background-color: #f9f9f9;
        border-radius: 6px;
      }
      
      .eksi-stat {
        flex: 1;
        min-width: 120px;
      }
      
      .eksi-stat-label {
        font-size: 12px;
        color: #777;
        display: block;
        margin-bottom: 5px;
      }
      
      .eksi-stat-value {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .eksi-modal-progress-container {
        width: 100%;
        height: 8px;
        background-color: #eee;
        border-radius: 4px;
        overflow: hidden;
        margin: 15px 0 5px 0;
      }
      
      .eksi-modal-progress-bar {
        height: 100%;
        background-color: #81c14b;
        border-radius: 4px;
      }
      
      /* Modal button specific styling */
      .eksi-modal-button {
        min-width: 100px;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .eksi-modal-content {
          background-color: #292a2d;
          color: #e0e0e0;
        }
        
        .eksi-modal-title {
          color: #f0f0f0;
          border-bottom-color: #444;
        }
        
        .eksi-modal-close {
          color: #999;
        }

        .eksi-modal-close:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ccc;
        }

        .eksi-modal-close:focus {
          background-color: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        
        .eksi-modal-options select,
        .eksi-modal-options textarea {
          background-color: #333;
          color: #e0e0e0;
          border-color: #444;
        }
        
        .eksi-modal-stats {
          background-color: #333;
        }
        
        .eksi-stat-label {
          color: #999;
        }
        
        .eksi-stat-value {
          color: #e0e0e0;
        }
      }
    `;

        this.cssHandler.addCSS(css);
    }
}